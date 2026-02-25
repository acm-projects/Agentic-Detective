import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in your environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function converse(userInput) {
  // obtain model (Gemini) from the generative API
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // start a fresh chat; no preset history so every request is independent
  const chat = model.startChat();

  // send whatever the frontend supplied
  const result = await chat.sendMessage(userInput);
  return result.response.text();
}

// Note: we should not call `converse` on import – the server will call it with real input
// export default converse();