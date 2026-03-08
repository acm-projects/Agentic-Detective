import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { converse } from './gemini.js';
import charData from "./data/characters.json" with { type: "json" };
import fs from 'fs';
import path from 'path';


dotenv.config();
const app = express();
const port = 3000;

app.use(cors({
    origin: "http://localhost:5174",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }));
app.use(express.json());

// Defining endpoints

// Gets response from Gemini API, POST method
app.post('/response', async (req, res) => {
    const {question, history} = req.body;

    if (!question) {
        return res.status(400).json({ error: "Missing 'question' in request body" });
    }

    try {
        console.log('Received question from frontend:', question);
        const responseText = await converse(question, history);
        res.json({ response: responseText });
    } catch (error) {
        console.error('Error fetching response:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Fetches character data from characters.json, GET method
// app.get('/characters', (req, res) => {
//     res.json(charData);
// });

// app.post('/save-case', (req, res) => {
//     const { caseId, caseTitle, suspects, characterProfiles } = req.body;

//     if (!suspects || !characterProfiles) {
//         return res.status(400).json({ error: "Missing suspects or characterProfiles" });
//     }

//     const dir = './data';
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//     const filename = `characters.json`;
//     const filepath = path.join(dir, filename);

//     const output = {
//         meta: {
//             caseId,
//             caseTitle,
//             savedAt: new Date().toISOString(),
//         },
//         suspects,
//         characterProfiles,
//     };

//     fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
//     console.log(`[save-case] Saved to ${filepath}`);
//     res.json({ success: true, file: filename });
// });


app.listen(port, () => {
    console.log(`Server is running on: http://localhost:${port}`)
});
