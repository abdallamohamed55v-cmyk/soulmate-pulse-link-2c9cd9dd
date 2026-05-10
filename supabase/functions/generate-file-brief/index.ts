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

const BRIEF_SYSTEM_BY_TYPE: Record<string, string> = {
  slides: `You generate a brief for a slide presentation. Return ONLY a JSON object with: {"summary": "2-3 sentences describing the deck", "outline": ["Slide 1 title", "Slide 2 title", ...], "tone": "professional|playful|academic", "language": "ar|en|...", "estimated_minutes": number}. Match outline length to requested page count. No markdown, no fences.`,
  document: `You generate a brief for a long-form document. Return ONLY JSON: {"summary": "2-3 sentences", "outline": ["Section 1", "Section 2", ...], "tone": "...", "language": "...", "estimated_words": number}.`,
  resume: `You generate a brief for a resume. Return ONLY JSON: {"summary": "1-2 sentences positioning the candidate", "sections": ["Header", "Summary", "Experience", "Education", "Skills", "Languages"], "style": "modern|classic|minimal", "language": "..."}.`,
  report: `You generate a brief for an analytical report. Return ONLY JSON: {"summary": "2-3 sentences", "outline": ["Executive Summary", "Findings", "Charts", "Recommendations"], "kpis": ["KPI 1", "KPI 2"], "language": "..."}.`,
  spreadsheet: `You generate a brief for a spreadsheet. Return ONLY JSON: {"summary": "1-2 sentences", "sheet_name": "...", "columns": ["Col 1", "Col 2", ...], "row_count_estimate": number, "formulas": ["SUM(...)", "..."], "language": "..."}.`,
  letter: `You generate a brief for a letter. Return ONLY JSON: {"summary": "1 sentence", "tone": "formal|friendly|firm", "key_points": ["...", "..."], "language": "..."}.`,
  roadmap: `You generate a brief for a roadmap. Return ONLY JSON: {"summary": "1-2 sentences", "phases": [{"name": "Phase 1", "goal": "..."}], "horizon": "Q1 2026 → Q4 2026", "language": "..."}.`,
  mindmap: `You generate a brief for a mind map. Return ONLY JSON: {"summary": "1-2 sentences", "central_idea": "...", "branches": ["Branch 1", "Branch 2", ...], "depth": number, "language": "..."}.`,
  timeline: `You generate a brief for a timeline. Return ONLY JSON: {"summary": "1-2 sentences", "events": [{"date": "YYYY-MM-DD", "title": "..."}], "orientation": "vertical|horizontal", "language": "..."}.`,
};

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
        body: JSON.stringify({ model, messages, response_format: { type: "json_object" } }),
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
    const { fileType, topic, pageCount, extra, userLanguage } = await req.json();
    if (!fileType || !topic) {
      return new Response(JSON.stringify({ success: false, error: "fileType and topic are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sys = BRIEF_SYSTEM_BY_TYPE[fileType] ?? BRIEF_SYSTEM_BY_TYPE.document;
    const userMsg = [
      `Topic: ${topic}`,
      pageCount ? `Requested length: ${pageCount} ${fileType === "slides" ? "slides" : "items"}` : null,
      extra ? `Additional context: ${JSON.stringify(extra)}` : null,
      userLanguage
        ? `IMPORTANT: Write the entire brief in this language: ${userLanguage}. Do not translate technical names.`
        : `Detect the language from the topic and mirror it in the brief.`,
    ].filter(Boolean).join("\n");

    let raw = "";
    try {
      raw = await callOpenRouter([
        { role: "system", content: sys + "\nReturn raw JSON only. No markdown fences." },
        { role: "user", content: userMsg },
      ]);
    } catch (e) {
      console.error("[file-brief] AI failed:", e);
      return new Response(JSON.stringify({ success: false, error: "Brief generation failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const brief = safeParseJson(raw) ?? { summary: raw };
    return new Response(JSON.stringify({ success: true, brief }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-file-brief error:", e);
    return new Response(JSON.stringify({ success: false, error: "Brief generation failed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
