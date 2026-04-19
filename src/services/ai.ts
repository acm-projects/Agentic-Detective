// src/lib/ai.ts

export type ModelId = "claude-haiku-4-5" | "claude-sonnet-4-5";

export const fastModel: ModelId  = "claude-haiku-4-5";
export const smartModel: ModelId = "claude-sonnet-4-5";

export async function callModel({
  model,
  system,
  messages,
  temperature = 0.9,
  max_tokens = 8000,  // ← was 1000, case generation needs much more
}: {
  model: ModelId;
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const response = await fetch("http://localhost:3000/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, system, messages, temperature, max_tokens }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM proxy error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data?.content?.find((b: any) => b.type === "text")?.text ?? "";
  if (!text) throw new Error("Empty response from LLM proxy");
  return text;
}