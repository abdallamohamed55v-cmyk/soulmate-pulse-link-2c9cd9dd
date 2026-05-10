// Generates a Document / Report / Letter / Resume from a prompt + template.
// Streams progress + content via SSE, persists final HTML to generated_sites,
// and enforces a 3/day quota for premium templates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_KEY  = Deno.env.get("LOVABLE_API_KEY")!;
const PREMIUM_DAILY_LIMIT = 3;

type Kind = "document" | "report" | "letter" | "resume";

const SECTION_HINTS: Record<Kind, string> = {
  document: "Open structure: title, intro, well-formed body sections with H2 headings, conclusion.",
  report:   "Cover heading, Executive Summary, numbered sections (1. Introduction, 2. Methodology, 3. Findings, 4. Recommendations), References list at the end.",
  letter:   "Letterhead block, Date, Recipient block, Greeting, 3-4 short paragraphs, Sign-off and Signature.",
  resume:   "Header (Name, Title, Contact), Summary, Experience (job, dates, bullets), Education, Skills (chips), Languages.",
};

// ─────────────────────────────────────────────────────────────
// Per-kind theme tokens (inspired by Veloured / ScriptForge / AI Visible refs)
// ─────────────────────────────────────────────────────────────
type Theme = {
  bg: string; surface: string; ink: string; muted: string; line: string;
  accent: string; accent2: string; fontH: string; fontB: string; fontMono: string;
  hero: "editorial" | "mono" | "warm" | "minimal";
};

function themeFor(kind: Kind, template: any): Theme {
  const a = template?.style?.accent;
  if (kind === "letter") return {
    bg: "#0e0e10", surface: "#15151a", ink: "#f5f3ee", muted: "#8a8783",
    line: "rgba(255,255,255,.08)", accent: a || "#c9a84c", accent2: "#f0d78c",
    fontH: "'Fraunces', 'Playfair Display', Georgia, serif",
    fontB: "'Inter', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    hero: "editorial",
  };
  if (kind === "report") return {
    bg: "#0a0a0a", surface: "#0f0f0f", ink: "#ffffff", muted: "#888",
    line: "#1f1f1f", accent: a || "#ffffff", accent2: "#3b82f6",
    fontH: "'Space Grotesk', system-ui, sans-serif",
    fontB: "'Inter', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    hero: "mono",
  };
  if (kind === "resume") return {
    bg: "#fbf7f5", surface: "#ffffff", ink: "#1a1614", muted: "#9b8880",
    line: "rgba(232,76,43,.15)", accent: a || "#e84c2b", accent2: "#f2705a",
    fontH: "'Sora', 'Space Grotesk', system-ui, sans-serif",
    fontB: "'Inter', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    hero: "warm",
  };
  // document (general)
  return {
    bg: "#fbf7f5", surface: "#ffffff", ink: "#1a1614", muted: "#9b8880",
    line: "rgba(0,0,0,.08)", accent: a || "#e84c2b", accent2: "#f2705a",
    fontH: "'DM Serif Display', 'Fraunces', Georgia, serif",
    fontB: "'Inter', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    hero: "minimal",
  };
}

function buildHtmlShell(inner: string, kind: Kind, template: any): string {
  const t = themeFor(kind, template);
  const title = (template?.name || kind).toString().replace(/</g, "");
  const isDark = t.bg.startsWith("#0") || t.bg.startsWith("#1");

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Sora:wght@500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,800&family=DM+Serif+Display:ital@0;1&family=Playfair+Display:ital,wght@0,400;0,700;1,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: ${t.bg};
  --surface: ${t.surface};
  --ink: ${t.ink};
  --muted: ${t.muted};
  --line: ${t.line};
  --accent: ${t.accent};
  --accent-2: ${t.accent2};
  --font-h: ${t.fontH};
  --font-b: ${t.fontB};
  --font-mono: ${t.fontMono};
  --radius: 20px;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: var(--bg); color: var(--ink);
  font-family: var(--font-b); line-height: 1.7; font-size: 16.5px;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
}
::selection { background: var(--accent); color: ${isDark ? "#000" : "#fff"}; }

/* Document shell — magazine-style article on a tinted canvas */
.doc {
  position: relative;
  max-width: 920px;
  margin: 0 auto;
  padding: 88px 72px 120px;
}
.doc::before {
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(60% 50% at 8% 0%, color-mix(in srgb, var(--accent) ${isDark ? "22%" : "14%"}, transparent), transparent 65%),
    radial-gradient(50% 40% at 100% 100%, color-mix(in srgb, var(--accent-2) ${isDark ? "18%" : "10%"}, transparent), transparent 70%);
}
.doc > * { position: relative; z-index: 1; }

/* Hero / cover block at the top (auto-applies to first H1) */
.doc > h1:first-child,
.doc > div[dir] > h1:first-child {
  font-family: var(--font-h);
  font-size: clamp(44px, 7vw, 88px);
  font-weight: 700;
  line-height: 0.98;
  letter-spacing: -0.04em;
  margin: 0 0 28px;
  color: var(--ink);
}
${t.hero === "warm" || t.hero === "minimal" ? `
.doc > h1:first-child::after,
.doc > div[dir] > h1:first-child::after {
  content: ""; display: block; width: 80px; height: 4px;
  background: var(--accent); margin-top: 24px; border-radius: 4px;
}` : ""}
${t.hero === "editorial" ? `
.doc > h1:first-child em,
.doc > div[dir] > h1:first-child em {
  font-style: italic; color: var(--accent); font-weight: 400;
}` : ""}

/* General typography */
h1 { font-family: var(--font-h); font-size: clamp(34px, 4.5vw, 52px); font-weight: 700; line-height: 1.05; letter-spacing: -0.03em; margin: 56px 0 20px; color: var(--ink); }
h2 {
  font-family: var(--font-h);
  font-size: clamp(24px, 2.6vw, 32px);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 56px 0 16px;
  color: var(--ink);
  display: flex; align-items: baseline; gap: 14px;
}
h2::before {
  content: counter(h2-counter, decimal-leading-zero);
  counter-increment: h2-counter;
  font-family: var(--font-mono);
  font-size: 13px; font-weight: 500;
  color: var(--accent);
  letter-spacing: 0.05em;
  flex-shrink: 0;
  padding-top: 6px;
}
.doc { counter-reset: h2-counter; }
h3 { font-family: var(--font-h); font-size: 21px; font-weight: 600; margin: 32px 0 10px; letter-spacing: -0.01em; color: var(--ink); }
p {
  margin: 0 0 18px;
  color: ${isDark ? "rgba(245,243,238,.78)" : "var(--ink)"};
  font-size: 17px; line-height: 1.75;
}
.doc > p:nth-of-type(1), .doc > div[dir] > p:nth-of-type(1) {
  font-size: 21px; line-height: 1.55; font-weight: 400;
  color: ${isDark ? "rgba(245,243,238,.92)" : "var(--ink)"};
  margin-bottom: 40px;
  ${t.hero === "editorial" ? "font-family: var(--font-h); font-style: italic;" : ""}
}
strong { color: var(--ink); font-weight: 600; }
em { font-style: italic; }
a {
  color: var(--accent); text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
  transition: border-color .2s var(--ease);
}
a:hover { border-bottom-color: var(--accent); }
ul, ol { margin: 0 0 20px; padding-left: 24px; }
li { margin-bottom: 8px; color: ${isDark ? "rgba(245,243,238,.78)" : "var(--ink)"}; }
li::marker { color: var(--accent); font-weight: 600; }

/* Tables — editorial bordered */
table {
  width: 100%; border-collapse: collapse; margin: 24px 0;
  font-size: 15px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
th, td { padding: 14px 12px; text-align: left; border-bottom: 1px solid var(--line); vertical-align: top; }
th {
  font-family: var(--font-mono); font-size: 12px; font-weight: 500;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--muted); border-bottom: 1px solid var(--ink);
}
tr:last-child td { border-bottom: none; }

/* Pull quote */
blockquote {
  margin: 40px -20px;
  padding: 32px 40px;
  font-family: var(--font-h);
  font-size: clamp(22px, 2.4vw, 30px);
  line-height: 1.35; letter-spacing: -0.015em;
  color: var(--ink);
  border-left: 3px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 4%, transparent);
  border-radius: 0 12px 12px 0;
}

hr { border: none; border-top: 1px solid var(--line); margin: 48px 0; }

/* Meta line (date / author) */
.meta {
  font-family: var(--font-mono); font-size: 12px;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--muted); margin-bottom: 20px; font-weight: 500;
}

/* Letter signature */
.signature {
  margin-top: 72px; padding-top: 32px;
  border-top: 1px solid var(--line);
  font-family: var(--font-h); font-size: 22px; color: var(--ink);
}

/* Resume specifics */
.skills { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 28px; padding: 0; list-style: none; }
.skills span, .skills li {
  font-family: var(--font-mono); font-size: 12px; font-weight: 500;
  background: ${isDark ? "rgba(255,255,255,.06)" : "color-mix(in srgb, var(--accent) 8%, transparent)"};
  color: var(--ink);
  border: 1px solid var(--line);
  padding: 7px 14px; border-radius: 999px;
  letter-spacing: 0.02em;
}
.experience-item {
  margin-bottom: 28px; padding: 24px 28px;
  background: ${isDark ? "rgba(255,255,255,.03)" : "var(--surface)"};
  border: 1px solid var(--line);
  border-radius: 16px;
  transition: transform .3s var(--ease), border-color .3s var(--ease);
}
.experience-item:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--accent) 35%, var(--line));
}
.experience-item .role {
  font-family: var(--font-h); font-weight: 700;
  font-size: 19px; color: var(--ink); letter-spacing: -0.01em;
}
.experience-item .dates {
  font-family: var(--font-mono); font-size: 12px;
  color: var(--muted); letter-spacing: 0.05em;
  text-transform: uppercase; margin-bottom: 10px;
}
.experience-item ul { margin-top: 8px; }

/* RTL support */
[dir="rtl"] h2 { flex-direction: row-reverse; }
[dir="rtl"] ul, [dir="rtl"] ol { padding-left: 0; padding-right: 24px; }
[dir="rtl"] blockquote {
  border-left: none; border-right: 3px solid var(--accent);
  border-radius: 12px 0 0 12px;
}
[dir="rtl"] .doc > h1:first-child::after { margin-left: auto; }

/* Responsive */
@media (max-width: 720px) {
  .doc { padding: 56px 24px 80px; }
  h2 { gap: 10px; }
  blockquote { margin: 28px 0; padding: 20px 22px; }
  .experience-item { padding: 18px 20px; }
}

/* Print — clean A4 */
@media print {
  body { background: #fff; color: #000; }
  .doc::before { display: none; }
  .doc { padding: 24mm 20mm; max-width: 100%; }
  h1, h2, h3, p, li { color: #000 !important; }
  .experience-item { break-inside: avoid; background: #fff; }
  blockquote { background: #fafafa; color: #000; }
  a { color: #000; border-bottom: 1px solid #000; }
}
</style>
</head><body><article class="doc">${inner}</article></body></html>`;
}

function sseLine(obj: any): string { return `data: ${JSON.stringify(obj)}\n\n`; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate via JWT
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const prompt   = (body?.prompt || "").toString().trim();
    const kind     = (body?.kind || "document") as Kind;
    const tpl      = body?.template || null;
    if (!prompt) return new Response("Missing prompt", { status: 400, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Premium quota check
    if (tpl?.category === "premium") {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("document_premium_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("used_at", since);
      if ((count || 0) >= PREMIUM_DAILY_LIMIT) {
        return new Response(JSON.stringify({
          message: `وصلت إلى الحد اليومي للقوالب المميزة (${PREMIUM_DAILY_LIMIT}/يوم). استخدم القوالب العادية أو حاول غداً.`,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (o: any) => controller.enqueue(enc.encode(sseLine(o)));

        try {
          send({ step: "start", message: "Loading template" });

          // Insert placeholder generated_sites row to get an id we can return early
          const { data: row, error: insErr } = await admin
            .from("generated_sites")
            .insert({
              user_id: userId,
              title: (tpl?.name || prompt || kind).toString().slice(0, 80),
              prompt,
              jsx_code: "",
              html_compiled: "",
              model_used: "google/gemini-2.5-flash",
              status: "generating",
            } as any)
            .select("id").single();
          if (insErr || !row) throw new Error(insErr?.message || "Could not create record");
          const siteId = row.id as string;
          send({ siteId });

          send({ step: "writing", message: "Writing content" });

          const sectionHint = SECTION_HINTS[kind] || SECTION_HINTS.document;
          const sysPrompt = [
            `You are an award-winning ${kind} writer producing editorial-grade content.`,
            `Output ONLY clean HTML body content (NO <html>, <head>, <body>, NO <style>, NO <script>, NO markdown fences).`,
            `Use semantic tags only: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <hr>, <blockquote>.`,
            `Start with exactly one <h1> as the title. Follow it with a single bold lead paragraph (1-3 sentences) that summarizes the piece.`,
            `Use <h2> for major sections (do NOT number them — numbering is added automatically).`,
            `Use <blockquote> for one or two pull-quotes that highlight a key insight.`,
            `Prefer concise, scannable paragraphs (2-4 sentences each). Avoid filler text and avoid generic headings like "Section 1".`,
            kind === "resume" ? `Use class="skills" on a <ul> for skill chips. For each job use <div class="experience-item"> with <div class="role">, <div class="dates">, then a <ul> of 3-5 measurable bullet achievements.` : "",
            kind === "letter" ? `Use class="signature" on the closing block. Keep paragraphs short and warm. Use 'em' inside the H1 for an italic emphasis word.` : "",
            kind === "report" ? `Include a <table> with key metrics where relevant. End with a "References" h2 listing sources as a numbered list.` : "",
            `Detect language of the user prompt and write in that language. If Arabic, wrap the entire content in <div dir="rtl"> ... </div>.`,
            `Style guidance for template "${tpl?.name || "default"}": ${tpl?.description || ""}.`,
            `Structure hint: ${sectionHint}`,
          ].filter(Boolean).join("\n");

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_KEY}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              stream: true,
              messages: [
                { role: "system", content: sysPrompt },
                { role: "user",   content: prompt },
              ],
            }),
          });

  try {
    // Authenticate via JWT
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const prompt   = (body?.prompt || "").toString().trim();
    const kind     = (body?.kind || "document") as Kind;
    const tpl      = body?.template || null;
    if (!prompt) return new Response("Missing prompt", { status: 400, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Premium quota check
    if (tpl?.category === "premium") {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("document_premium_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("used_at", since);
      if ((count || 0) >= PREMIUM_DAILY_LIMIT) {
        return new Response(JSON.stringify({
          message: `وصلت إلى الحد اليومي للقوالب المميزة (${PREMIUM_DAILY_LIMIT}/يوم). استخدم القوالب العادية أو حاول غداً.`,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (o: any) => controller.enqueue(enc.encode(sseLine(o)));

        try {
          send({ step: "start", message: "Loading template" });

          // Insert placeholder generated_sites row to get an id we can return early
          const { data: row, error: insErr } = await admin
            .from("generated_sites")
            .insert({
              user_id: userId,
              title: (tpl?.name || prompt || kind).toString().slice(0, 80),
              prompt,
              jsx_code: "",
              html_compiled: "",
              model_used: "google/gemini-2.5-flash",
              status: "generating",
            } as any)
            .select("id").single();
          if (insErr || !row) throw new Error(insErr?.message || "Could not create record");
          const siteId = row.id as string;
          send({ siteId });

          send({ step: "writing", message: "Writing content" });

          const sectionHint = SECTION_HINTS[kind] || SECTION_HINTS.document;
          const sysPrompt = [
            `You are an expert ${kind} writer.`,
            `Output ONLY clean HTML body content (NO <html>, <head>, <body>, NO <style>, NO <script>).`,
            `Use semantic tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <table>, <hr>, <blockquote>.`,
            kind === "resume" ? `Use class="skills" on a <div> for skill chips with <span> children. Use class="experience-item" for each job, with <div class="role">, <div class="dates">, and a <ul> of bullets.` : "",
            kind === "letter" ? `Use class="signature" on the closing block.` : "",
            `Detect language of the user prompt and write in that language. If Arabic, set the article to RTL by starting with <div dir="rtl"> and closing with </div>.`,
            `Style guidance for this template "${tpl?.name || "default"}": ${tpl?.description || ""}.`,
            `Structure: ${sectionHint}`,
          ].filter(Boolean).join("\n");

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_KEY}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              stream: true,
              messages: [
                { role: "system", content: sysPrompt },
                { role: "user",   content: prompt },
              ],
            }),
          });

          if (!aiRes.ok || !aiRes.body) {
            const txt = await aiRes.text().catch(() => "");
            if (aiRes.status === 429) {
              throw new Error("AI gateway rate limit. Please retry shortly.");
            }
            throw new Error(`AI error ${aiRes.status}: ${txt.slice(0, 200)}`);
          }

          const reader = aiRes.body.getReader();
          const dec = new TextDecoder();
          let buf = "";
          let inner = "";
          let charsSinceTick = 0;

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            let idx: number;
            while ((idx = buf.indexOf("\n")) !== -1) {
              const raw = buf.slice(0, idx).trim();
              buf = buf.slice(idx + 1);
              if (!raw.startsWith("data:")) continue;
              const data = raw.slice(5).trim();
              if (data === "[DONE]") continue;
              try {
                const j = JSON.parse(data);
                const piece = j?.choices?.[0]?.delta?.content || "";
                if (piece) {
                  inner += piece;
                  charsSinceTick += piece.length;
                  send({ delta: piece });
                  if (charsSinceTick > 1500) {
                    charsSinceTick = 0;
                    send({ step: "writing", message: "Writing content" });
                  }
                }
              } catch { /* partial */ }
            }
          }

          send({ step: "polishing", message: "Polishing" });

          // Sanitize: strip any accidental <html>/<body> wrappers from the model
          const cleaned = inner
            .replace(/^```html\s*/i, "")
            .replace(/```\s*$/i, "")
            .replace(/<\/?(html|head|body|!doctype)[^>]*>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .trim();

          const finalHtml = buildHtmlShell(cleaned || `<h1>${prompt}</h1><p>(empty result)</p>`, kind, tpl);

          await admin.from("generated_sites").update({
            html_compiled: finalHtml,
            jsx_code: cleaned,
            status: "completed",
          } as any).eq("id", siteId);

          if (tpl?.category === "premium") {
            await admin.from("document_premium_usage").insert({
              user_id: userId,
              template_id: tpl?.id || null,
              kind,
            } as any);
          }

          send({ done: true, siteId });
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e: any) {
          console.error("[generate-document] stream error:", e?.message, e?.stack);
          try {
            controller.enqueue(new TextEncoder().encode(sseLine({ error: e?.message || "Generation failed" })));
            controller.close();
          } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
