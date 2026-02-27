import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in your environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function converse(userInput, history = []) {
  // obtain model (Gemini) from the generative API
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const formattedHistory = history.map(msg => ([
    { role: "user", parts: [{ text: msg.question }] },
    { role: "model", parts: [{ text: msg.answer }] },
  ])).flat();

  // start a fresh chat; no preset history so every request is independent
  const chat = model.startChat({
    history: formattedHistory
  });
  
  // send whatever the frontend supplied
  const result = await chat.sendMessage(userInput);
  return result.response.text();
}

// Note: we should not call `converse` on import – the server will call it with real input
// export default converse();