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

function fontFor(kind: Kind, style: any): { heading: string; body: string } {
  if (style?.fontFamily) return { heading: style.fontFamily, body: style.fontFamily };
  if (kind === "resume") return { heading: "'Sora', 'Inter', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" };
  if (kind === "report") return { heading: "'Fraunces', 'Source Serif 4', Georgia, serif", body: "'Inter', system-ui, sans-serif" };
  if (kind === "letter") return { heading: "'Fraunces', 'Cormorant Garamond', Georgia, serif", body: "'Inter', system-ui, sans-serif" };
  return { heading: "'Space Grotesk', 'Inter', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" };
}

function accentFor(id: string): { a: string; b: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return { a: `hsl(${hue}, 85%, 56%)`, b: `hsl(${(hue + 40) % 360}, 90%, 62%)` };
}

function buildHtmlShell(inner: string, kind: Kind, template: any): string {
  const palette = template?.style?.accent
    ? { a: template.style.accent, b: template?.style?.accent2 || template.style.accent }
    : accentFor(template?.id || kind);
  const fonts = fontFor(kind, template?.style || {});
  const title = (template?.name || kind).toString().replace(/</g, "");
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=Sora:wght@500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --accent: ${palette.a};
  --accent-2: ${palette.b};
  --ink: #0a0a0f;
  --ink-soft: #3f3f46;
  --muted: #71717a;
  --line: rgba(0,0,0,.08);
  --bg: #f6f5f2;
  --card: #ffffff;
  --grad: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  --grad-soft: linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent-2) 10%, transparent));
  --radius: 24px;
  --shadow: 0 1px 2px rgba(10,10,15,.04), 0 24px 60px -20px rgba(10,10,15,.18);
  --font-h: ${fonts.heading};
  --font-b: ${fonts.body};
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink); font-family: var(--font-b); line-height: 1.7; -webkit-font-smoothing: antialiased; }
body::before {
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(60% 50% at 12% 0%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%),
    radial-gradient(50% 40% at 100% 100%, color-mix(in srgb, var(--accent-2) 15%, transparent), transparent 70%);
}
.page {
  position: relative; z-index: 1;
  max-width: 880px; margin: 40px auto; padding: 72px 72px 88px;
  background: var(--card); border-radius: var(--radius);
  box-shadow: var(--shadow);
  border: 1px solid var(--line);
  overflow: hidden;
}
.page::before {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 6px; background: var(--grad);
}
h1 {
  font-family: var(--font-h);
  font-size: clamp(38px, 5vw, 56px); font-weight: 700; line-height: 1.05;
  letter-spacing: -0.035em; margin: 0 0 18px;
  background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent;
}
h2 {
  font-family: var(--font-h);
  font-size: 26px; font-weight: 700; margin: 44px 0 14px; color: var(--ink);
  letter-spacing: -0.02em; position: relative; padding-left: 18px;
}
h2::before {
  content: ""; position: absolute; left: 0; top: 10px; bottom: 10px; width: 4px;
  background: var(--grad); border-radius: 4px;
}
h3 { font-family: var(--font-h); font-size: 19px; font-weight: 600; margin: 24px 0 8px; letter-spacing: -0.01em; }
p  { margin: 0 0 14px; color: var(--ink-soft); font-size: 16.5px; }
strong { color: var(--ink); }
ul, ol { margin: 0 0 16px; padding-left: 22px; color: var(--ink-soft); }
li { margin-bottom: 6px; }
li::marker { color: var(--accent); }
a { color: var(--accent); text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); }
a:hover { border-bottom-color: var(--accent); }
table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 18px 0; font-size: 14.5px; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); }
th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--line); }
th { background: var(--grad-soft); font-weight: 600; color: var(--ink); }
tr:last-child td { border-bottom: none; }
blockquote {
  margin: 20px 0; padding: 18px 22px; border-radius: 14px;
  background: var(--grad-soft);
  border-left: 4px solid var(--accent);
  font-family: var(--font-h); font-size: 18px; color: var(--ink); font-style: italic;
}
hr { border: none; border-top: 1px dashed var(--line); margin: 32px 0; }
.meta { color: var(--muted); font-size: 13px; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 14px; font-weight: 600; }
.signature { margin-top: 56px; padding-top: 24px; border-top: 1px solid var(--line); font-family: var(--font-h); font-size: 18px; color: var(--ink); }
.skills { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 18px; padding: 0; list-style: none; }
.skills span, .skills li {
  background: var(--grad-soft); color: var(--ink);
  padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600;
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}
.experience-item {
  margin-bottom: 22px; padding: 20px 22px; border-radius: 16px;
  background: #fafaf9; border: 1px solid var(--line);
}
.experience-item .role { font-family: var(--font-h); font-weight: 700; font-size: 17px; color: var(--ink); }
.experience-item .dates { color: var(--muted); font-size: 13px; font-weight: 500; margin-bottom: 6px; }
[dir="rtl"] h2 { padding-left: 0; padding-right: 18px; }
[dir="rtl"] h2::before { left: auto; right: 0; }
[dir="rtl"] ul, [dir="rtl"] ol { padding-left: 0; padding-right: 22px; }
[dir="rtl"] blockquote { border-left: none; border-right: 4px solid var(--accent); }
@media (max-width: 720px) {
  .page { margin: 16px; padding: 40px 28px 56px; border-radius: 18px; }
  h1 { font-size: 34px; }
  h2 { font-size: 22px; }
}
@media print {
  body { background: #fff; }
  body::before { display: none; }
  .page { box-shadow: none; margin: 0; padding: 48px; max-width: 100%; border-radius: 0; border: none; }
  h1 { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head><body><article class="page">${inner}</article></body></html>`;
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
