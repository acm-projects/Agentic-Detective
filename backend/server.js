import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { converse } from './gemini.js';

dotenv.config();
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Defining endpoints
app.post('/response', async (req, res) => {
    const playerQuestion = req.body.question;

    if (!playerQuestion) {
        return res.status(400).json({ error: "Missing 'question' in request body" });
    }

    try {
        console.log('Received question from frontend:', playerQuestion);
        const responseText = await converse(playerQuestion);
        res.json({ response: responseText });
    } catch (error) {
        console.error('Error fetching response:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on: http://localhost:${port}`)
})