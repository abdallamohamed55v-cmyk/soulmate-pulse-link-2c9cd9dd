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

function fontFor(kind: Kind, style: any): string {
  if (style?.fontFamily) return style.fontFamily;
  if (kind === "resume") return "'Inter', system-ui, sans-serif";
  if (kind === "report") return "'Source Serif 4', Georgia, serif";
  if (kind === "letter") return "'Georgia', 'Times New Roman', serif";
  return "'Inter', system-ui, sans-serif";
}

function accentFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 70%, 45%)`;
}

function buildHtmlShell(inner: string, kind: Kind, template: any): string {
  const accent = template?.style?.accent || accentFor(template?.id || kind);
  const font   = fontFor(kind, template?.style || {});
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${(template?.name || kind).toString().replace(/</g, "")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root { --accent: ${accent}; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #f4f4f5; color: #18181b; font-family: ${font}; line-height: 1.65; }
.page { max-width: 820px; margin: 24px auto; padding: 64px 72px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 8px 32px rgba(0,0,0,.04); border-radius: 4px; }
h1 { font-size: 32px; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.02em; }
h2 { font-size: 22px; font-weight: 600; margin: 32px 0 10px; color: #111; border-bottom: 2px solid var(--accent); padding-bottom: 6px; display: inline-block; }
h3 { font-size: 17px; font-weight: 600; margin: 20px 0 6px; }
p  { margin: 0 0 12px; }
ul, ol { margin: 0 0 14px; padding-left: 22px; }
li { margin-bottom: 4px; }
a { color: var(--accent); }
table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 14px; }
th, td { border: 1px solid #e4e4e7; padding: 8px 10px; text-align: left; }
th { background: #fafafa; font-weight: 600; }
blockquote { border-left: 3px solid var(--accent); padding: 4px 0 4px 14px; color: #444; margin: 14px 0; }
.meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
.signature { margin-top: 48px; }
.skills { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 14px; }
.skills span { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); padding: 4px 10px; border-radius: 999px; font-size: 13px; font-weight: 500; }
.experience-item { margin-bottom: 18px; }
.experience-item .role { font-weight: 600; }
.experience-item .dates { color: #6b7280; font-size: 13px; }
hr { border: none; border-top: 1px solid #e4e4e7; margin: 24px 0; }
@media print { body { background: #fff; } .page { box-shadow: none; margin: 0; padding: 48px; max-width: 100%; border-radius: 0; } }
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
              source: "generate-document",
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
