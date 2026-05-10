import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL_CHAIN = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
];

const AVAILABLE_TOOLS = [
  "WEB_SEARCH", "FETCH_URL", "BROWSE_WEBSITE", "GENERATE_IMAGE", "GENERATE_VIDEO",
  "GENERATE_VOICE", "CODE_INTERPRETER", "SEARCH_ATTACHMENTS", "REMEMBER_FACT",
  "SHOPPING_SEARCH", "CANVA_CREATE_SLIDES",
];

const SYSTEM = `You are a Skill Designer assistant. The user wants to create a custom AI persona/skill (an expert role the AI can adopt — e.g. "Etsy SEO expert", "YC pitch coach", "Solidity auditor").

Your job:
1. If you have ENOUGH info, return a complete skill draft.
2. If important info is missing, ask ONE short clarifying question first.
3. Always reply in the user's language.

You MUST respond with raw JSON only, one of:

A) Need more info:
{"action":"ask","message":"<one short question in the user's language>"}

B) Skill ready:
{"action":"draft","summary":"<2 sentences in user's language explaining what you built>","skill":{
  "name":"<short English title, 2-4 words>",
  "description":"<one sentence — when should the AI activate this skill>",
  "body":"<full SKILL.md markdown body in English: # Role, ## Expertise, ## How you respond, ## Style — 200-500 words>",
  "triggers":["keyword1","keyword2", ...],
  "enabled_tools":[<subset of: ${AVAILABLE_TOOLS.join(", ")}>],
  "preferred_model": null
}}

Rules:
- Skill name, body, description, triggers MUST be in English regardless of chat language.
- "summary" MUST be in the user's chat language.
- Pick 2-5 tools that genuinely match the role. Empty array if none needed.
- 4-10 trigger keywords — lowercase, real terms users would type.
- The body should give the AI a strong, specific persona: experience level, frameworks they use, how they structure answers.`;

async function callLovableAI(messages: Array<{ role: string; content: string }>) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  let lastErr: unknown = null;
  for (const model of MODEL_CHAIN) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 45_000);
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages, response_format: { type: "json_object" } }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t));
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        lastErr = new Error(`${r.status} ${txt.slice(0, 200)}`);
        if (r.status === 429 || r.status === 402) continue;
        continue;
      }
      const d = await r.json();
      const c = d?.choices?.[0]?.message?.content;
      if (!c) { lastErr = new Error("empty"); continue; }
      return c as string;
    } catch (e) { lastErr = e; }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All providers failed");
}

function parseJson(raw: string) {
  try { return JSON.parse(raw); } catch { /* */ }
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* */ } }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const raw = await callLovableAI([
      { role: "system", content: SYSTEM },
      ...messages.slice(-12).map((m: any) => ({ role: m.role, content: String(m.content || "") })),
    ]);
    const data = parseJson(raw) || { action: "ask", message: "Could you describe the skill in a bit more detail?" };
    return new Response(JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-skill error", e);
    return new Response(JSON.stringify({ action: "ask", message: "Sorry, something went wrong. Please try again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
