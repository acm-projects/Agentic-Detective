import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const app = express();
const port = 3000;

const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
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
      ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ?? '',
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
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY ?? '' },
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