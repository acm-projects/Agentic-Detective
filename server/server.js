import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import talk from "./talk.js";
dotenv.config();

const app = express();
app.use(cors());

const PORT = 3001;

app.get("/api/voice", async (req, res) => {
  console.log("Route was hit"); 
  
  try {
    const text = req.query.text;
    // const text = "happy birthday";
    console.log("Text: ", text);
    talk(text, res);

  } catch(err) {
    console.error(err, " Error calling ElevenLabs.")
  }

});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

