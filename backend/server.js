import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import charData from "./data/characters.json" with { type: "json" };
import fs from 'node:fs';
import path from 'node:path';
const app = express();
const port = 3000;

const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));


app.use(express.json());

// Defining endpoints

 app.post('/save-case', (req, res) => {
     const { caseId, caseTitle, suspects, characterProfiles } = req.body;

     if (!suspects || !characterProfiles) {
         return res.status(400).json({ error: "Missing suspects or characterProfiles" });
     }

     const dir = './data';
     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
     const filename = `characters.json`;
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
    console.log(`Server is running on: http://localhost:${port}`)
});
