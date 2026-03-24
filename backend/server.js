import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

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
app.post('/case/create', async (req, res) => {
  try {
    console.log('[/case/create] received:', req.body.sessionId);
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
app.post('/case/:sessionId/progress', async (req, res) => {
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

// Endpoint dedicated to the outcome decision after accusastion
app.post('/case/:sessionId/outcome', async (req, res) => {
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

// GET Method to get case data
app.get('/case/:sessionId', async (req, res) => {
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
app.get('/case/user/:userId', async (req, res) => {
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
