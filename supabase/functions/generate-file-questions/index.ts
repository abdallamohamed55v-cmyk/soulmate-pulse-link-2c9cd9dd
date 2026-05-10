import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FILES_MODEL_CHAIN = [
  "z-ai/glm-4.5-air:free",
  "deepseek/deepseek-chat-v3.1:free",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.0-flash-001",
];

const SYSTEM = `You generate 3-5 short clarifying questions to help create a professional file for the user.
Return ONLY JSON: {"questions":[{"title":"<short question>","options":["opt1","opt2","opt3","opt4"],"allowText":true}]}
Rules:
- Detect the user's language from the topic and write the questions and options in THAT language exactly.
- Each "title" is one short, friendly sentence (max 12 words).
- Each "options" array has 3-4 concrete choices (max 5 words each).
- Always set allowText: true so the user can type a custom answer.
- Tailor questions to file type (resume → role/experience/highlights; document → audience/tone/length; report → KPIs/period/audience; spreadsheet → columns/use case; letter → tone/recipient/purpose; roadmap → horizon/team size; mindmap → depth/center idea; timeline → range/granularity; slides → audience/tone/structure).
- IMPORTANT: vary your angle every call. Do NOT ask the same questions twice for the same topic.
- Never wrap with markdown fences.`;

async function callOpenRouter(messages: Array<{ role: string; content: string }>): Promise<string> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) throw new Error("OPENROUTER_API_KEY missing");

  let lastErr: unknown = null;
  for (const model of FILES_MODEL_CHAIN) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 45_000);
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://megsyai.com",
          "X-Title": "Megsy Files",
        },
        body: JSON.stringify({ model, messages, temperature: 0.95, response_format: { type: "json_object" } }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t));

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.warn(`[openrouter:${model}] ${r.status}: ${txt.slice(0, 160)}`);
        lastErr = new Error(`${r.status}`);
        continue;
      }
      const d = await r.json();
      const c = d?.choices?.[0]?.message?.content;
      if (!c) { lastErr = new Error("empty"); continue; }
      return c;
    } catch (e) {
      console.warn(`[openrouter:${model}] error`, e);
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All providers failed");
}

function safeParseJson<T = unknown>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch { /* */ }
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]) as T; } catch { /* */ } }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { fileType, topic, userLanguage, seed, avoidQuestions } = await req.json();
    if (!fileType || !topic) {
      return new Response(JSON.stringify({ success: false, error: "fileType and topic required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const langHint = userLanguage ? `Write everything in this language: ${userLanguage}.` : `Mirror the language of the topic.`;
    const variationSeed = typeof seed === "number" ? seed : Date.now();
    const avoidList = Array.isArray(avoidQuestions) && avoidQuestions.length
      ? `\n\nDo NOT repeat or paraphrase any of these previous questions:\n${avoidQuestions.slice(0, 8).map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}\nAsk about completely different angles instead.`
      : "";

    let raw = "";
    try {
      raw = await callOpenRouter([
        { role: "system", content: SYSTEM + "\nReturn raw JSON only. No markdown fences." },
        { role: "user", content: `File type: ${fileType}\nTopic: ${topic}\n${langHint}\nVariation seed: ${variationSeed} — produce a fresh angle different from previous runs.${avoidList}` },
      ]);
    } catch (e) {
      console.error("[file-questions] AI failed:", e);
      return new Response(JSON.stringify({ success: true, questions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = safeParseJson<{ questions?: unknown[] }>(raw) ?? { questions: [] };
    return new Response(JSON.stringify({ success: true, questions: parsed.questions ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-file-questions error", e);
    return new Response(JSON.stringify({ success: true, questions: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
