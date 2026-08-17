import { CATEGORIES, parseAiOutput, SYSTEM_PROMPT } from "./content";
import { readStore } from "./store";

function models() {
  return {
    anthropic: "claude-sonnet-4-20250514",
    openai: "gpt-4o",
    gemini: "gemini-2.0-flash",
  } as const;
}

export async function generateArticle(category: string, keywords: string) {
  const settings = readStore().settings;
  const provider = settings.provider;
  if (provider === "cursor") {
    throw new Error("Cursor는 이 서버에서 초안 생성에 쓸 수 없습니다. Anthropic, OpenAI, Gemini 중 하나를 선택하세요.");
  }
  const key = settings.keys[provider] || "";
  if (!key) {
    throw new Error("API 키가 없습니다. 설정에서 키를 저장하세요.");
  }
  const label = CATEGORIES[category] || category;
  const user = `카테고리: ${label}\n키워드: ${keywords}\n위 주제로 글을 작성하세요.`;
  let raw = "";
  if (provider === "anthropic") raw = await callAnthropic(key, user);
  else if (provider === "openai") raw = await callOpenAI(key, user);
  else if (provider === "gemini") raw = await callGemini(key, user);
  else throw new Error("알 수 없는 제공자입니다.");
  const parsed = parseAiOutput(raw);
  if (!parsed.title || !parsed.content) throw new Error("초안을 해석하지 못했습니다.");
  return parsed;
}

export async function pingProvider(provider: string) {
  if (provider === "cursor") throw new Error("Cursor는 이 서버에서 연결 확인할 수 없습니다.");
  const key = readStore().settings.keys[provider] || "";
  if (!key) throw new Error("키가 없습니다.");
  let res: Response;
  if (provider === "anthropic") {
    res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
  } else if (provider === "openai") {
    res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
  } else if (provider === "gemini") {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
  } else {
    throw new Error("알 수 없는 제공자입니다.");
  }
  if (!res.ok) throw new Error(`연결 실패 (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

async function callAnthropic(key: string, user: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: models().anthropic,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Anthropic ${res.status}`);
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Anthropic 응답이 비었습니다.");
  return text as string;
}

async function callOpenAI(key: string, user: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: models().openai,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI ${res.status}`);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI 응답이 비었습니다.");
  return text as string;
}

async function callGemini(key: string, user: string) {
  const model = models().gemini;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Gemini ${res.status}`);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini 응답이 비었습니다.");
  return text as string;
}
