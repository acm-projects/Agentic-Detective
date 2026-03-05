import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

const PORT = 5555;

app.get("/api/voice", async (req, res) => {
  console.log("Route was hit"); 
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVEN_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "Agentic Detective is the best!",
          model_id: "eleven_multilingual_v2",
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.log("ElevenLabs error:", errText);
      return res.status(500).send(errText);
    }

    const audioBuffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

