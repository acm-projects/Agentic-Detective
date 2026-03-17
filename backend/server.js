import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const app = express();
const port = 3000;

// ── MongoDB setup ──
const client = new MongoClient(process.env.ATLAS_URI);
let db;

async function connectDB() {
  await client.connect();
  db = client.db("AgenticDetective");
  console.log("MongoDB connected");
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

// ── Routes ──


app.post('/case/create', async (req, res) => {
  console.log('[/case/create] reaceived:', req.body.caseId);
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
