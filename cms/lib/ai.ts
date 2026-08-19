import {
  categoryLabel,
  EXCERPT_PROMPT,
  fallbackExcerpt,
  parseAiOutput,
  plainText,
  SYSTEM_PROMPT,
} from "./content";
import { readStore } from "./store";
import { getWpCategoryTree } from "./wordpress";

function models() {
  return {
    anthropic: "claude-sonnet-4-20250514",
    openai: "gpt-4o",
    gemini: "gemini-3.6-flash",
  } as const;
}

type Provider = "anthropic" | "openai" | "gemini";

async function resolveProvider(override?: { provider?: string; key?: string }): Promise<{ provider: Provider; key: string }> {
  const settings = (await readStore()).settings;
  const provider = (override?.provider || settings.provider) as string;
  if (provider === "cursor") {
    throw new Error("Cursor는 이 서버에서 초안 생성에 쓸 수 없습니다. Anthropic, OpenAI, Gemini 중 하나를 선택하세요.");
  }
  if (provider !== "anthropic" && provider !== "openai" && provider !== "gemini") {
    throw new Error("알 수 없는 제공자입니다.");
  }
  const key = (override?.key || settings.keys[provider] || "").trim();
  if (!key) {
    throw new Error("API 키가 없습니다. 설정에서 키를 저장하세요.");
  }
  return { provider, key };
}

async function complete(system: string, user: string, override?: { provider?: string; key?: string }) {
  const { provider, key } = await resolveProvider(override);
  if (provider === "anthropic") return callAnthropic(key, user, system);
  if (provider === "openai") return callOpenAI(key, user, system);
  if (provider === "gemini") return callGemini(key, user, system);
  throw new Error("알 수 없는 제공자입니다.");
}

export { complete };

export async function generateArticle(category: string, keywords: string) {
  const tree = await getWpCategoryTree();
  const label = categoryLabel(category, tree);
  const user = `카테고리: ${label}\n키워드: ${keywords}\n위 주제로 글을 작성하세요.`;
  const raw = await complete(SYSTEM_PROMPT, user);
  const parsed = parseAiOutput(raw);
  if (!parsed.title || !parsed.content) throw new Error("초안을 해석하지 못했습니다.");
  return parsed;
}

/** 본문 기반 요약. API 불가 시 본문 앞부분 폴백. */
export async function generateExcerpt(title: string, content: string) {
  const body = plainText(content);
  if (!body) return "";
  try {
    const user = `제목: ${title || "(제목 없음)"}\n\n본문:\n${body.slice(0, 3500)}\n\n위 본문을 요약하세요.`;
    const raw = (await complete(EXCERPT_PROMPT, user)).trim().replace(/^["“”]|["“”]$/g, "");
    const oneLine = raw.split(/\r\n|\n|\r/).map((l) => l.trim()).filter(Boolean).join(" ");
    return oneLine.slice(0, 160) || fallbackExcerpt(content);
  } catch {
    return fallbackExcerpt(content);
  }
}

export async function pingProvider(provider: string, keyOverride?: string) {
  if (provider === "cursor") throw new Error("Cursor는 이 서버에서 연결 확인할 수 없습니다.");
  const key = (keyOverride || (await readStore()).settings.keys[provider] || "").trim();
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

async function callAnthropic(key: string, user: string, system = SYSTEM_PROMPT) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: models().anthropic,
      max_tokens: system === EXCERPT_PROMPT ? 256 : 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Anthropic ${res.status}`);
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Anthropic 응답이 비었습니다.");
  return text as string;
}

async function callOpenAI(key: string, user: string, system = SYSTEM_PROMPT) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: models().openai,
      max_tokens: system === EXCERPT_PROMPT ? 256 : undefined,
      messages: [
        { role: "system", content: system },
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

async function callGemini(key: string, user: string, system = SYSTEM_PROMPT) {
  const model = models().gemini;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: system === EXCERPT_PROMPT ? { maxOutputTokens: 256 } : undefined,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Gemini ${res.status}`);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini 응답이 비었습니다.");
  return text as string;
}
