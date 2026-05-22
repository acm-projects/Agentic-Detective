// services/ai.ts

export type Provider = "groq" | "gemini";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export async function callModel({
  model,
  provider,
  system,
  messages,
  temperature = 0.9,
  max_tokens = 8000,
}: {
  model: string;
  provider: Provider;
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const response = await fetch(`${API_BASE}/api/llm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, provider, system, messages, temperature, max_tokens }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM proxy error ${response.status}: ${err}`);
  }

  const data = await response.json();
  console.log("[LLM proxy raw response]", JSON.stringify(data));
  const text = data?.text ?? "";
  if (!text) throw new Error("Empty response from LLM proxy");
  return text;
}