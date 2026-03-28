import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const app = express();
const port = 3000;

// ── MongoDB setup ──
const client = new MongoClient(process.env.ATLAS_URI);
let db;

async function connectDB() {
  await client.connect();
  db = client.db("AgenticDetective");
  console.log("MongoDB connected");

  // Creating indexes for faster data retrieval

  await db.collection("cases").createIndex({ sessionId: 1 }, { unique: true });
  await db.collection("cases").createIndex({ userId: 1, status: 1, updatedAt: 1 });

}

// ── Middleware ──
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  }
}));

app.use(express.json());

// ─────────────────────────────────────────────
//  MCP CLIENT — singleton, spawned once on first use
// ─────────────────────────────────────────────

let mcpClient = null;

async function getMcpClient() {
  if (mcpClient) return mcpClient;

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', '../mcp/mcpServer.ts'],   // path relative to backend/
    env: {
      ...process.env,
      ELEVENLABS_API_KEY: process.env.ELEVEN_LABS_API_KEY ?? '',
    },
  });

  mcpClient = new Client({ name: 'agentic-detective', version: '1.0.0' });
  await mcpClient.connect(transport);
  console.log('[MCP] Voice selector connected');
  return mcpClient;
}

// ─────────────────────────────────────────────
//  POST /select-voices
//  Body: { suspects: Suspect[], settingHint?: string }
//  Returns: { voiceIds: Record<string, string> }
// ─────────────────────────────────────────────

app.post('/select-voices', async (req, res) => {
  const { suspects, settingHint } = req.body;

  if (!suspects?.length) {
    return res.status(400).json({ error: 'Missing suspects array' });
  }

  try {
    const client = await getMcpClient();
    const voiceIds = {};

    for (const suspect of suspects) {
      const result = await client.callTool({
        name: 'select_v3_voice_for_suspect',
        arguments: {
          name:                suspect.name,
          gender:              suspect.gender,
          age:                 suspect.age,
          personality:         suspect.personality,
          occupation:          suspect.occupation,
          physicalDescription: suspect.physicalDescription,
          accentHint:          settingHint,
        },
      });

      const raw = result.content?.[0]?.text ?? '{}';
      console.log(`[voices] Raw response for ${suspect.name}:`, raw);
      try {
        const parsed = JSON.parse(raw);
        voiceIds[suspect.name] = parsed.selected_voice_id ?? '';
        console.log(`[voices] ${suspect.name} → ${voiceIds[suspect.name]} (${parsed.voice_name})`);
      } catch (e) {
        console.warn(`[voices] Failed to parse response for ${suspect.name}:`, e);
        console.warn(`[voices] Raw was:`, JSON.stringify(raw));
        voiceIds[suspect.name] = '';
      }
    }

    res.json({ voiceIds });
  } catch (err) {
    console.error('[select-voices] Error:', err);
    res.status(500).json({ error: 'Voice selection failed', voiceIds: {} });
  }
});

// ─────────────────────────────────────────────
//  GET /debug-voices  — shows raw ElevenLabs voice data
// ─────────────────────────────────────────────

app.get('/debug-voices', async (req, res) => {
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': process.env.ELEVEN_LABS_API_KEY ?? '' },
  });
  const data = await response.json();
  const slim = data.voices.map(v => ({
    name: v.name,
    category: v.category,
    high_quality_base_model_ids: v.high_quality_base_model_ids,
    labels: v.labels,
  }));
  res.json(slim);
});

// ─────────────────────────────────────────────
//  POST /save-case  (your existing endpoint — unchanged)
// ─────────────────────────────────────────────

app.post('/save-case', (req, res) => {
  const { caseId, caseTitle, suspects, characterProfiles } = req.body;

  if (!suspects || !characterProfiles) {
    return res.status(400).json({ error: 'Missing suspects or characterProfiles' });
  }

  const dir = './data';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = 'characters.json';
  const filepath = path.join(dir, filename);

  const output = {
    meta: {
      caseId,
      caseTitle,
      savedAt: new Date().toISOString(),
    },
    suspects,
    characterProfiles,
  };

  fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
  console.log(`[save-case] Saved to ${filepath}`);
  res.json({ success: true, file: filename });
});

app.listen(port, () => {
  console.log(`Server is running on: http://localhost:${port}`);
});
// -- Helpers --
const STATUS = new Set(["in_progress", "paused", "resolved", "abandoned"]);

function nowIso() {
  return new Date().toISOString();
}


function buildInitialClueState(initialClues = []) {
  const out = {};
  for (const clue of initialClues) {
    // This is only for maintaining the Clue State (i.e. whether it has been discovered, or its been lost)
    // The clue metadata is in caseData.initialClues
    out[clue.id] = {
      discovered: Boolean(clue.discovered),
      clueLost: Boolean(clue.clueLost)
    };
  }
  return out;
}

function isValidStatus(status) {
  return STATUS.has(status);
}

function buildInitialSuspectSessions(suspects = []) {
  return suspects.map((s) => ({
    suspectName: s.name,
    conversationCount: 0,
    currentStress: 0,
    firstInterrogatedAt: null,
    lastInterrogatedAt: null,
    messages: [],
    
  }));

};

// ── Routes ──
app.post('/cases/create', async (req, res) => {
  try {
    console.log('[/cases/create] received:', req.body.sessionId);
    const now = nowIso();
    const {
      sessionId,
      userId,
      caseData,
      game,
      seed
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    if (!userId) {
      return res.status(400).json({ error: "User must be signed in to save progress" });
    }

    if (!game) {
      return res.status(400).json({ error: "game data is required" });
    }

    if (!caseData?.caseReport) {
      return res.status(400).json({ error: "caseData.caseReport is required" });
    }
    if (!Array.isArray(caseData?.suspects)) {
      return res.status(400).json({ error: "caseData.suspects is required" });
    }
    if (!Array.isArray(caseData?.initialClues)) {
      return res.status(400).json({ error: "caseData.initialClues is required" });
    }
    if (!seed) {
      return res.status(400).json({ error: "seed is required" });
    }

    const doc = {
      schemaVersion: 1,
      sessionId,
      caseId: sessionId,
      userId: userId ?? "",
      createdAt: now,
      updatedAt: now,
      lastAutosavedAt: now,
      revision: 1,
      status: "in_progress",

      caseData: {
        storyline: caseData.storyline ?? null,
        suspects: caseData.suspects,
        caseReport: caseData.caseReport,
        characterProfiles: caseData.characterProfiles,
        initialClues: caseData.initialClues,
      },

      game: {
        phase: game?.phase ?? "briefing",
        elapsedSeconds: game?.elapsedSeconds ?? 0,
        activeSuspectName: game?.activeSuspectName ?? null,
        totalConversationCount: game?.totalConversationCount ?? 0,
        seed: seed ?? null,
      },

      interrogation: {
        suspectSessions: buildInitialSuspectSessions(caseData.suspects),
      },

      clueState: buildInitialClueState(caseData.initialClues),

      schedulerState: {
        timerPaused: false,
        nextFireAt: null,
        lastFiredAt: null,
      },
      outcome: {
        accusedName: null,
        isCorrect: null,
        trueKiller: null,
        explanation: null,
        decidedAt: null,
      }
    };

    // Avoid clobbering an existing session on duplicate create requests.
    await db.collection("cases").updateOne(
      { sessionId },
      { $setOnInsert: doc },
      { upsert: true }
    );

    res.json({ success: true, sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Case records are now based on sessionId instead of caseId
// This is a general POST route that updates every update in the player's gameplay (if any)
app.post('/cases/:sessionId/progress', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      status,
      game,
      interrogation,
      clueState,
      schedulerState,
    } = req.body;

    console.log("Progress updation endpoint reached!");
    console.log("sessionId:", sessionId);
    console.log("userId", req.body.userId);

    if (status && !isValidStatus(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const patch = {
      ...(status ? { status } : {}),
      ...(game ? { game } : {}),
      ...(interrogation ? { interrogation } : {}),
      ...(clueState ? { clueState } : {}),
      ...(schedulerState ? { schedulerState } : {}),
      updatedAt: nowIso(),
      lastAutosavedAt: nowIso(),
    };

    const result = await db.collection("cases").updateOne(
      { $or: [{ sessionId }, { caseId: sessionId }] },
      { $set: patch, $inc: { revision: 1 } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Case not found" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* SUSPECT NOTES ENDPOINT, FIX LATER
app.post('/case/:sessionId/suspectNotes', async (req, res) => {
  const { suspectName, suspectNotes } = req.body;

  try {
    const safeName = suspectName.replaceAll('.', '_'); 

    const result = await db.collection('cases').updateOne(
      { sessionId: req.params.caseId },
      { $set: { [`notes.${safeName}`]: suspectNotes } }
    );
    console.log("caseId:", req.params.caseId);
    console.log("body:", req.body);
    console.log("UPDATE RESULT:", result); 

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }

});
*/

app.get('/case/:sessionId/notes', async (req, res) => {
  const { suspectName } = req.query;
  if(!suspectName){}
  try {
    const doc = await db.collection('cases').findOne(
      { sessionId: req.params.caseId },
      { projection: { _id: 0, notes: 1 } }
    );

    if (!doc) return res.status(404).json({ error: "Case not found" });

    const suspectNotes = doc.notes?.[suspectName] || null;

    res.json({ suspectNotes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Endpoint dedicated to the outcome decision after accusastion
app.post('/cases/:sessionId/outcome', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { 
      accusedName, 
      isCorrect, 
      trueKiller, 
      explanation,
    } = req.body;

    console.log("outcome updation endpoint reached!");

    const result = await db.collection("cases").updateOne(
      { $or: [{ sessionId }, { caseId: sessionId }] },
      { $set: {
        outcome: {
          accusedName,
          isCorrect,
          trueKiller,
          explanation,
          decidedAt: nowIso(),
        },
        status: "resolved",
        updatedAt: nowIso(),
        lastAutosavedAt: nowIso(),
      },
      $inc: { revision: 1 } 
    });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Case not found" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Method to get case data from session id
app.get('/cases/:sessionId', async (req, res) => {
  try {
    const doc = await db.collection("cases").findOne(
      { sessionId: req.params.sessionId },
      { projection: { _id: 0 } } // tells mongo to exclude the _id field
    );

    if (!doc) {
      return res.status(404).json({ error: "Case not found" });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to fetch all cases for a particular user
app.get('/cases/user/:userId', async (req, res) => {
  console.log("User ID case fetching endpoint reached!!!");
  console.log("userId:", req.params.userId);
  try {
    const { userId } = req.params;

    const docs = await db.collection("cases")
      .find({ userId }, { projection: { _id: 0 } })
      .sort({ updatedAt: -1 }) // most recent first
      .toArray();

    if (!docs.length) {
      return res.status(404).json({ error: "No cases found for this user" });
    }

    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
})
/*
app.post('/case/create', async (req, res) => {
  console.log('[/case/create] received:', req.body.caseId);
  const { caseId, caseReport, clues, characterProfiles } = req.body;
  try {
    await db.collection('cases').insertOne({
      caseId,
      createdAt: new Date(),
      status: 'in_progress',
      caseReport,
      clues,
      characterProfiles,
      chatHistory: {},
      outcome: null,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/case/:caseId/chat', async (req, res) => {
  const { suspectName, messages } = req.body;
  try {
    await db.collection('cases').updateOne(
      { caseId: req.params.caseId },
      { $set: { [`chatHistory.${suspectName}`]: messages } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/case/:caseId/outcome', async (req, res) => {
  const { accusedName, isCorrect, trueKiller, explanation } = req.body;
  try {
    await db.collection('cases').updateOne(
      { caseId: req.params.caseId },
      { $set: { outcome: { accusedName, isCorrect, trueKiller, explanation }, status: 'resolved' } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/case/:caseId', async (req, res) => {
  console.log('!!!!!')
  console.log('[GET /case/:caseId] looking for:', req.params.caseId);
  try {
    const doc = await db.collection('cases').findOne(
      { caseId: req.params.caseId },
      { projection: { _id: 0 } }
    );
    console.log('[GET /case/:caseId] found:', doc ? 'yes' : 'null');
    if (!doc) return res.status(404).json({ error: "Case not found" });
    res.json(doc);
  } catch (err) {
    console.error('[GET /case/:caseId] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
*/

// ── Start server only after DB connects ──
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on: http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
