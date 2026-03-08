import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { converse } from './gemini.js';
import charData from "./data/characters.json" with { type: "json" };

dotenv.config();
const app = express();
const port = 3000;

app.use(cors());
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
app.get('/characters', (req, res) => {
    res.json(charData);
});

app.listen(port, () => {
    console.log(`Server is running on: http://localhost:${port}`)
});