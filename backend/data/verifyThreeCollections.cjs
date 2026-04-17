const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env' });

async function verifyThreeCollections() {
  const uri = process.env.ATLAS_URI;
  if (!uri) {
    throw new Error('ATLAS_URI is missing in .env');
  }

  const client = new MongoClient(uri);
  const sessionId = `VERIFY-${Date.now()}`;
  const userId = `verify-user-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  const caseDoc = {
    schemaVersion: 1,
    sessionId,
    caseId: sessionId,
    createdAt: now,
    updatedAt: now,
    caseData: {
      storyline: 'verification-run',
      suspects: [],
      caseReport: { caseId: sessionId, caseTitle: 'Verification Case' },
      characterProfiles: [],
      initialClues: [],
    },
  };

  const gameDoc = {
    schemaVersion: 1,
    sessionId,
    caseId: sessionId,
    userId,
    createdAt: now,
    updatedAt: now,
    lastAutosavedAt: now,
    revision: 1,
    status: 'in_progress',
    game: {
      phase: 'briefing',
      elapsedSeconds: 0,
      activeSuspectName: null,
      totalConversationCount: 0,
    },
    seed: null,
    interrogation: { suspectSessions: [] },
    notes: { activeSuspectName: null, suspectNotes: [] },
    clueState: {},
    schedulerState: { timerPaused: false, nextFireAt: null, lastFiredAt: null },
    outcome: {
      accusedName: null,
      isCorrect: null,
      trueKiller: null,
      explanation: null,
      decidedAt: null,
      gameplayRating: null,
      featured: false,
      feedbackAt: null,
    },
  };

  try {
    await client.connect();

    const db = client.db('AgenticDetective');
    const users = db.collection('users');
    const cases = db.collection('cases');
    const game = db.collection('game');

    const caseWrite = await cases.updateOne(
      { sessionId },
      { $setOnInsert: caseDoc },
      { upsert: true }
    );

    const userWrite = await users.updateOne(
      { userId },
      {
        $setOnInsert: { userId, createdAt: now },
        $addToSet: { createdCaseIds: sessionId },
        $set: { updatedAt: now },
      },
      { upsert: true }
    );

    const gameWrite = await game.updateOne(
      { sessionId, userId },
      { $setOnInsert: gameDoc },
      { upsert: true }
    );

    const caseExists = await cases.findOne({ sessionId }, { projection: { _id: 1 } });
    const userExists = await users.findOne({ userId }, { projection: { _id: 1 } });
    const gameExists = await game.findOne({ sessionId, userId }, { projection: { _id: 1 } });

    const summary = {
      writes: {
        cases: { matched: caseWrite.matchedCount, upserted: caseWrite.upsertedCount },
        users: { matched: userWrite.matchedCount, upserted: userWrite.upsertedCount },
        game: { matched: gameWrite.matchedCount, upserted: gameWrite.upsertedCount },
      },
      checks: {
        caseExists: Boolean(caseExists),
        userExists: Boolean(userExists),
        gameExists: Boolean(gameExists),
      },
      keys: { sessionId, userId },
    };

    console.log(JSON.stringify(summary, null, 2));

    await Promise.all([
      cases.deleteOne({ sessionId }),
      game.deleteOne({ sessionId, userId }),
      users.updateOne({ userId }, { $pull: { createdCaseIds: sessionId } }),
    ]);

    console.log('Verification cleanup completed.');
  } finally {
    await client.close();
  }
}

verifyThreeCollections().catch((err) => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
