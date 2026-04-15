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

// ── Middleware ──
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// app.options('*', cors());
app.use(express.json());

// ── MongoDB setup ──
const client = new MongoClient(process.env.ATLAS_URI);
let db;
let usersCollection;
let casesCollection;
let gameCollection;

async function connectDB() {
  await client.connect();
  db = client.db("AgenticDetective");
  usersCollection = db.collection("users");
  casesCollection = db.collection("cases");
  gameCollection = db.collection("game");
  console.log("MongoDB connected");

  // Create the collections explicitly so they exist even before the first insert.
  const existingCollections = await db.listCollections().toArray();
  const existingNames = new Set(existingCollections.map((collection) => collection.name));

  if (!existingNames.has("users")) {
    await db.createCollection("users");
  }
  if (!existingNames.has("cases")) {
    await db.createCollection("cases");
  }
  if (!existingNames.has("game")) {
    await db.createCollection("game");
  }

  // Creating indexes for faster data retrieval

  await usersCollection.createIndex({ userId: 1 }, { unique: true });

  await casesCollection.createIndex({ sessionId: 1 }, { unique: true });
  await casesCollection.createIndex({ caseId: 1 });

  await gameCollection.createIndex({ sessionId: 1, userId: 1 }, { unique: true });
  await gameCollection.createIndex({ userId: 1, status: 1, updatedAt: 1 });
  await gameCollection.createIndex({ 'outcome.featured': 1, updatedAt: -1 });

}



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

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'agentic-detective-backend' });
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

function buildInitialNotesState() {
  return {
    activeSuspectName: null,
    suspectNotes: [],
  };
}

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

    const caseDoc = {
      schemaVersion: 1,
      sessionId,
      caseId: sessionId,
      createdAt: now,
      updatedAt: now,

      caseData: {
        storyline: caseData.storyline ?? null,
        suspects: caseData.suspects,
        caseReport: caseData.caseReport,
        characterProfiles: caseData.characterProfiles,
        initialClues: caseData.initialClues,
      },
    };

    const gameDoc = {
      schemaVersion: 1,
      sessionId,
      caseId: sessionId,
      userId: userId ?? "",
      createdAt: now,
      updatedAt: now,
      lastAutosavedAt: now,
      revision: 1,
      status: "in_progress",
      game: {
        phase: game?.phase ?? "briefing",
        elapsedSeconds: game?.elapsedSeconds ?? 0,
        activeSuspectName: game?.activeSuspectName ?? null,
        totalConversationCount: game?.totalConversationCount ?? 0,
      },
      seed: seed ?? null,

      interrogation: {
        suspectSessions: buildInitialSuspectSessions(caseData.suspects),
      },

      notes: {
        ...buildInitialNotesState(),
        activeSuspectName: game?.activeSuspectName ?? null,
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
        gameplayRating: null,
        featured: false,
        feedbackAt: null,
      }
    };

    // Case content is global and user-agnostic.
    await casesCollection.updateOne(
      { sessionId },
      { $setOnInsert: caseDoc },
      { upsert: true }
    );

    // User profile stores which cases this user has created.
    await usersCollection.updateOne(
      { userId },
      {
        $setOnInsert: { userId, createdAt: now },
        $addToSet: { createdCaseIds: sessionId },
        $set: { updatedAt: now },
      },
      { upsert: true }
    );

    // Game collection stores user-specific gameplay state.
    await gameCollection.updateOne(
      { sessionId, userId },
      { $setOnInsert: gameDoc },
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
    const userId = String(req.body.userId ?? '').trim();

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

    const result = await gameCollection.updateOne(
      userId ? { sessionId, userId } : { sessionId },
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
app.post('/case/:sessionId/suspectNotes', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { suspectName, suspectNotes } = req.body;
    const userId = String(req.body.userId ?? '').trim();

    if (!suspectName || !String(suspectName).trim()) {
      return res.status(400).json({ error: 'suspectName is required' });
    }

    if (!suspectNotes || !String(suspectNotes).trim()) {
      return res.status(400).json({ error: 'suspectNotes is required' });
    }

    const noteEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      suspectName: String(suspectName).trim(),
      suspectNotes: String(suspectNotes).trim(),
      createdAt: nowIso(),
    };

    const result = await gameCollection.updateOne(
      userId ? { sessionId, userId } : { sessionId },
      {
        $push: { 'notes.suspectNotes': noteEntry },
        $set: {
          'notes.activeSuspectName': String(suspectName).trim(),
          updatedAt: nowIso(),
          lastAutosavedAt: nowIso(),
        },
        $inc: { revision: 1 },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json({ success: true, note: noteEntry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/case/:sessionId/suspectNotes', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const suspectName = String(req.query.suspectName ?? '').trim();
    const userId = String(req.query.userId ?? '').trim();

    const doc = await gameCollection.findOne(
      userId ? { sessionId, userId } : { sessionId },
      { projection: { _id: 0, notes: 1 } }
    );

    if (!doc) return res.status(404).json({ error: 'Case not found' });

    const allNotes = Array.isArray(doc.notes?.suspectNotes) ? doc.notes.suspectNotes : [];
    const filteredNotes = suspectName
      ? allNotes.filter((note) => String(note?.suspectName ?? '') === suspectName)
      : allNotes;

    res.json(filteredNotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/case/:sessionId/notes', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = String(req.query.userId ?? '').trim();
    const doc = await gameCollection.findOne(
      userId ? { sessionId, userId } : { sessionId },
      { projection: { _id: 0, notes: 1 } }
    );

    if (!doc) return res.status(404).json({ error: 'Case not found' });

    res.json(Array.isArray(doc.notes?.suspectNotes) ? doc.notes.suspectNotes : []);
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
    const userId = String(req.body.userId ?? '').trim();

    console.log("outcome updation endpoint reached!");

    const result = await gameCollection.updateOne(
      userId ? { sessionId, userId } : { sessionId },
      { $set: {
        outcome: {
          accusedName,
          isCorrect,
          trueKiller,
          explanation,
          decidedAt: nowIso(),
          gameplayRating: null,
          featured: false,
          feedbackAt: null,
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

app.post('/cases/:sessionId/feedback', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { gameplayRating, featured } = req.body;
    const userId = String(req.body.userId ?? '').trim();

    if (![1, 2, 3, 4, 5].includes(Number(gameplayRating))) {
      return res.status(400).json({ error: 'gameplayRating must be 1-5' });
    }

    if (typeof featured !== 'boolean') {
      return res.status(400).json({ error: 'featured must be boolean' });
    }

    const result = await gameCollection.updateOne(
      userId ? { sessionId, userId } : { sessionId },
      {
        $set: {
          'outcome.gameplayRating': Number(gameplayRating),
          'outcome.featured': featured,
          'outcome.feedbackAt': nowIso(),
          updatedAt: nowIso(),
          lastAutosavedAt: nowIso(),
        },
        $inc: { revision: 1 },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/community/cases/:caseCode/template', async (req, res) => {
  try {
    const caseCode = String(req.params.caseCode ?? '').trim();
    if (!caseCode) {
      return res.status(400).json({ error: 'caseCode is required' });
    }

    const caseCodeRegex = new RegExp(`^${caseCode}$`, 'i');
    const doc = await casesCollection.findOne(
      {
        $or: [
          { sessionId: caseCodeRegex },
        ],
      },
      {
        sort: { updatedAt: -1 },
        projection: {
          _id: 0,
          sessionId: 1,
          caseData: 1,
        },
      }
    );

    if (!doc?.sessionId) {
      return res.status(404).json({ error: 'Case code not found' });
    }

    const gameDoc = await gameCollection.findOne(
      { sessionId: doc.sessionId },
      { projection: { _id: 0, seed: 1 } }
    );

    res.json({
      caseData: doc.caseData,
      seed: gameDoc?.seed ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/community/feed', async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit ?? 12);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(30, requestedLimit))
      : 12;

    const gameDocs = await gameCollection
      .find(
        { 'outcome.featured': true },
        {
          projection: {
            _id: 0,
            userId: 1,
            sessionId: 1,
            updatedAt: 1,
            'outcome.gameplayRating': 1,
          },
        }
      )
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();

    const sessionIds = [...new Set(gameDocs.map((doc) => doc.sessionId).filter(Boolean))];
    const caseDocs = await casesCollection
      .find(
        { sessionId: { $in: sessionIds } },
        {
          projection: {
            _id: 0,
            sessionId: 1,
            caseId: 1,
            'caseData.caseReport.caseId': 1,
            'caseData.caseReport.caseTitle': 1,
            'caseData.caseReport.officialBriefing': 1,
            'caseData.caseReport.setting': 1,
          },
        }
      )
      .toArray();

    const caseBySessionId = new Map(caseDocs.map((doc) => [doc.sessionId, doc]));

    const cases = gameDocs.map((gameDoc) => {
      const caseDoc = caseBySessionId.get(gameDoc.sessionId) ?? {};
      const report = caseDoc.caseData?.caseReport ?? {};
      return {
        caseCode: report.caseId ?? caseDoc.caseId ?? gameDoc.sessionId,
        title: report.caseTitle ?? 'Untitled Case',
        author: gameDoc.userId ? `Detective ${gameDoc.userId.slice(0, 8)}` : 'Anonymous Detective',
        description: report.officialBriefing ?? report.setting ?? 'No case description available.',
        gameplayRating: Number(gameDoc.outcome?.gameplayRating ?? 0),
        updatedAt: gameDoc.updatedAt ?? null,
      };
    });

    const contributors = await gameCollection
      .aggregate([
        {
          $match: {
            userId: { $type: 'string', $ne: '' },
            'outcome.featured': true,
            'outcome.gameplayRating': { $gte: 1, $lte: 5 },
          },
        },
        {
          $group: {
            _id: '$userId',
            caseCount: { $sum: 1 },
            averageRating: { $avg: '$outcome.gameplayRating' },
            bestRating: { $max: '$outcome.gameplayRating' },
          },
        },
        { $sort: { averageRating: -1, caseCount: -1 } },
        { $limit: 8 },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            caseCount: 1,
            averageRating: { $round: ['$averageRating', 2] },
            bestRating: 1,
          },
        },
      ])
      .toArray();

    const formattedContributors = contributors.map((c) => ({
      name: `Detective ${String(c.userId).slice(0, 8)}`,
      caseCount: Number(c.caseCount ?? 0),
      averageRating: Number(c.averageRating ?? 0),
      bestRating: Number(c.bestRating ?? 0),
    }));

    res.json({ cases, contributors: formattedContributors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Method to get case data from session id
app.get('/cases/:sessionId', async (req, res) => {
  try {
    const caseDoc = await casesCollection.findOne(
      { sessionId: req.params.sessionId },
      { projection: { _id: 0 } } // tells mongo to exclude the _id field
    );

    if (!caseDoc) {
      return res.status(404).json({ error: "Case not found" });
    }

    const userId = String(req.query.userId ?? '').trim();
    const gameDoc = await gameCollection.findOne(
      userId ? { sessionId: req.params.sessionId, userId } : { sessionId: req.params.sessionId },
      { projection: { _id: 0 } }
    );

    if (!gameDoc) {
      return res.json(caseDoc);
    }

    const merged = {
      ...gameDoc,
      schemaVersion: caseDoc.schemaVersion ?? gameDoc.schemaVersion,
      sessionId: caseDoc.sessionId,
      caseId: caseDoc.caseId ?? gameDoc.caseId,
      caseData: caseDoc.caseData,
    };

    res.json(merged);
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

    const gameDocs = await gameCollection
      .find({ userId }, { projection: { _id: 0 } })
      .sort({ updatedAt: -1 }) // most recent first
      .toArray();

    if (!gameDocs.length) {
      console.log("No cases found for this user");
      return res.json([]);
      // return res.status(404).json({ error: "No cases found for this user" });
    }

    const sessionIds = [...new Set(gameDocs.map((doc) => doc.sessionId).filter(Boolean))];
    const caseDocs = await casesCollection
      .find({ sessionId: { $in: sessionIds } }, { projection: { _id: 0 } })
      .toArray();

    const caseBySessionId = new Map(caseDocs.map((doc) => [doc.sessionId, doc]));

    const docs = gameDocs.map((gameDoc) => {
      const caseDoc = caseBySessionId.get(gameDoc.sessionId) ?? null;
      return {
        ...gameDoc,
        caseData: caseDoc?.caseData ?? null,
      };
    });

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
