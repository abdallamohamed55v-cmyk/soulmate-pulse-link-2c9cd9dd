// Webly proxy: forwards requests to Webly API with sane error handling and CORS.
// Routes:
//   POST /webly-proxy            -> { action: "generate" | "deploy" | "screenshot", ... }
//
// Why a proxy: keeps the upstream URL out of the client, lets us inject server-side
// helpers (e.g. take screenshot via screenshotone) and unify CORS behavior.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEBLY_BASE = "https://wxphtsgezburjqoqiqqo.supabase.co/functions/v1";

const sse = (payload: Record<string, unknown>) => `data: ${JSON.stringify(payload)}\n\n`;

const extractHtml = (text: string, prompt: string) => {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const raw = fenced || text.trim();
  if (/<!doctype html/i.test(raw) || /<html[\s>]/i.test(raw)) return raw;
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Generated project</title><style>body{margin:0;font-family:Inter,system-ui,sans-serif;background:#08090d;color:#fff;min-height:100vh;display:grid;place-items:center;padding:32px}main{max-width:880px}h1{font-size:clamp(36px,7vw,72px);line-height:1;margin:0 0 18px}p{font-size:18px;line-height:1.7;color:#d7dae2}</style></head><body><main><h1>${prompt.replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c)).slice(0, 90)}</h1><p>${raw.replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c)).slice(0, 1200)}</p></main></body></html>`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "generate";

    if (action === "generate") {
      if (!body.project_id || !body.prompt) {
        return new Response(JSON.stringify({ error: "Missing project_id or prompt" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Streaming pass-through
      const upstream = await fetch(`${WEBLY_BASE}/webly-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: body.project_id,
          prompt: body.prompt,
          messages: body.messages ?? [],
        }),
      });

      if (!upstream.ok || !upstream.body) {
        await upstream.text().catch(() => "");
        // Universal fallback: generate HTML via Lovable AI Gateway and stream it back as SSE.
        const lovableKey = Deno.env.get("LOVABLE_API_KEY");
        if (lovableKey) {
          try {
            const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: "You generate polished production-ready single-file websites. Return ONLY complete HTML with embedded CSS and JavaScript inside a single ```html code block. No prose." },
                  ...(Array.isArray(body.messages) ? body.messages : []),
                  { role: "user", content: body.prompt },
                ],
              }),
            });
            if (ai.ok) {
              const data = await ai.json().catch(() => ({} as any));
              const content = data?.choices?.[0]?.message?.content || "";
              const html = extractHtml(String(content), body.prompt);
              const stream = new ReadableStream({
                start(controller) {
                  const enc = new TextEncoder();
                  controller.enqueue(enc.encode(sse({ type: "text", delta: "Generating preview" })));
                  controller.enqueue(enc.encode(sse({ type: "file_start", path: "/index.html" })));
                  controller.enqueue(enc.encode(sse({ type: "file_done", path: "/index.html", content: html })));
                  controller.enqueue(enc.encode(sse({ type: "done", mode: "local", files: { "/index.html": html } })));
                  controller.enqueue(enc.encode("data: [DONE]\n\n"));
                  controller.close();
                },
              });
              return new Response(stream, {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
              });
            }
          } catch (_) { /* fall through */ }
        }
        return new Response(JSON.stringify({ error: "Build service is busy. Please retry." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(upstream.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    if (action === "deploy") {
      // Try the upstream Webly deploy first.
      try {
        const r = await fetch(`${WEBLY_BASE}/webly-deploy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: body.project_id }),
        });
        const data = await r.json().catch(() => ({} as any));
        if (r.ok && (data?.cloudflare_url || data?.url)) {
          return new Response(JSON.stringify({ ok: true, ...data, cloudflare_url: data.cloudflare_url || data.url }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch {}

      // Fallback: publish the local snapshot to the published-sites bucket.
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const projectRowId = body.project_row_id;
        if (!projectRowId) {
          return new Response(JSON.stringify({ ok: false, error: "Missing project_row_id" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: row } = await supabase
          .from("projects")
          .select("files_snapshot, user_id")
          .eq("id", projectRowId)
          .maybeSingle();
        const files = (row as any)?.files_snapshot || {};
        const indexHtml: string | undefined =
          files["/index.html"] || files["index.html"] || Object.values(files).find((v) => typeof v === "string" && /<html/i.test(String(v))) as string | undefined;
        if (!indexHtml) {
          return new Response(JSON.stringify({ ok: false, error: "No index.html in snapshot" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Upload every html file under sites/<project_id>/...
        const slug = String(body.project_id).replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "site";
        const base = `sites/${slug}`;
        const uploads: Promise<unknown>[] = [];
        for (const [path, content] of Object.entries(files)) {
          if (typeof content !== "string") continue;
          const cleanPath = path.startsWith("/") ? path.slice(1) : path;
          const objectPath = `${base}/${cleanPath || "index.html"}`;
          const ct =
            cleanPath.endsWith(".html") || cleanPath === "" ? "text/html; charset=utf-8" :
            cleanPath.endsWith(".css") ? "text/css" :
            cleanPath.endsWith(".js") ? "application/javascript" :
            cleanPath.endsWith(".json") ? "application/json" :
            cleanPath.endsWith(".svg") ? "image/svg+xml" : "text/plain";
          uploads.push(
            supabase.storage.from("published-sites").upload(objectPath, new Blob([content], { type: ct }), {
              contentType: ct,
              upsert: true,
            }),
          );
        }
        await Promise.allSettled(uploads);
        const { data: pub } = supabase.storage.from("published-sites").getPublicUrl(`${base}/index.html`);
        const url = pub.publicUrl;
        return new Response(JSON.stringify({ ok: true, url, cloudflare_url: url }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "Publish failed" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "screenshot") {
      // Capture preview thumbnail using ScreenshotOne and save to storage.
      const projectId = body.project_id;
      const userId = body.user_id;
      const targetUrl = body.url || `${WEBLY_BASE}/webly-site/${projectId}`;
      if (!projectId || !userId) {
        return new Response(JSON.stringify({ error: "Missing project_id or user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessKey = Deno.env.get("ScreenshotOne_Access Key");
      if (!accessKey) {
        // Silent skip — screenshots are optional
        return new Response(JSON.stringify({ ok: false, skipped: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams({
        access_key: accessKey,
        url: targetUrl,
        viewport_width: "1280",
        viewport_height: "800",
        device_scale_factor: "1",
        format: "jpg",
        image_quality: "75",
        block_ads: "true",
        block_cookie_banners: "true",
        cache: "false",
        delay: "2",
      });

      try {
        const shotResp = await fetch(`https://api.screenshotone.com/take?${params}`);
        if (!shotResp.ok) {
          // Silent skip — preview not ready yet, no need to error the UI
          return new Response(JSON.stringify({ ok: false, skipped: true, reason: "capture_failed" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const blob = await shotResp.arrayBuffer();

        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        const path = `${userId}/projects/${projectId}.jpg`;
        const { error: uploadErr } = await supabase.storage.from("user-images").upload(path, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });
        if (uploadErr) {
          return new Response(JSON.stringify({ ok: false, skipped: true, reason: "upload_failed" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: pub } = supabase.storage.from("user-images").getPublicUrl(path);
        const previewUrl = `${pub.publicUrl}?t=${Date.now()}`;

        await supabase.from("projects").update({ preview_url: previewUrl }).eq("id", projectId);

        return new Response(JSON.stringify({ ok: true, preview_url: previewUrl }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ ok: false, skipped: true, reason: "exception" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Service error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
