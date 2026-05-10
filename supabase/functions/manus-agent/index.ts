import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 5 * 60 * 1000;

// Smart key rotation for Manus API keys
const manusKeyCache: { id: string; api_key: string; expiry: number } = { id: "", api_key: "", expiry: 0 };

async function getManusKey(sb: ReturnType<typeof createClient>): Promise<{ id: string; api_key: string } | null> {
  if (manusKeyCache.api_key && Date.now() < manusKeyCache.expiry) return manusKeyCache;
  const { data } = await sb.from("api_keys").select("id, api_key").eq("service", "manus").eq("is_active", true).eq("is_blocked", false).limit(10);
  if (!data || data.length === 0) return null;
  const pick = data[Math.floor(Math.random() * data.length)];
  manusKeyCache.id = pick.id;
  manusKeyCache.api_key = pick.api_key;
  manusKeyCache.expiry = Date.now() + CACHE_TTL_MS;
  return pick;
}

// Hyperbrowser key for fallback browser automation
async function getHyperbrowserKey(sb: ReturnType<typeof createClient>): Promise<string | null> {
  const { data } = await sb.from("api_keys").select("id, api_key").eq("service", "hyperbrowser").eq("is_active", true).eq("is_blocked", false).limit(10);
  if (!data || data.length === 0) return null;
  return data[Math.floor(Math.random() * data.length)].api_key;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { task, task_type, user_id } = await req.json();
    if (!task || !user_id) {
      return new Response(JSON.stringify({ error: "Missing task or user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Try Manus API first
    const manusKey = await getManusKey(sb);
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const push = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        push({ status: "Starting task..." });

        if (manusKey) {
          // Official Manus API path
          try {
            push({ status: "Using Manus AI..." });
            
            const resp = await fetch("https://api.manus.im/v1/tasks", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${manusKey.api_key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prompt: task,
                type: task_type || "document",
              }),
            });

            if (resp.ok) {
              const result = await resp.json();
              push({ status: "Task completed", result });
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
            
            push({ status: "Manus API unavailable, using fallback..." });
          } catch {
            push({ status: "Manus API error, using fallback..." });
          }
        }

        // Fallback: Use Hyperbrowser to automate manus.im website
        const hbKey = await getHyperbrowserKey(sb);
        if (!hbKey) {
          push({ status: "No automation keys available", error: "Service temporarily unavailable. Please try again later." });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        push({ status: "Starting Megsy Computer for this task..." });

        try {
          const HB_BASE = "https://api.hyperbrowser.ai";
          const browserTask = `Go to https://manus.im and create the following: ${task}. Once complete, download or copy the result.`;

          const startResp = await fetch(`${HB_BASE}/api/task/hyper-agent`, {
            method: "POST",
            headers: { "x-api-key": hbKey, "Content-Type": "application/json" },
            body: JSON.stringify({ task: browserTask, maxSteps: 25, keepBrowserOpen: false }),
          });

          if (!startResp.ok) {
            push({ status: "Failed to start browser task", error: "Could not start the automation. Please try again." });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          const startData = await startResp.json();
          const jobId = startData.jobId;
          if (!jobId) {
            push({ error: "No task ID returned" });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          push({ status: "Megsy Computer is working...", browser: { liveUrl: startData.liveUrl } });

          // Poll for completion
          let pollCount = 0;
          const MAX_POLLS = 60;
          const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

          while (pollCount < MAX_POLLS) {
            await sleep(3000);
            pollCount++;

            try {
              const statusResp = await fetch(`${HB_BASE}/api/task/hyper-agent/${jobId}/status`, {
                headers: { "x-api-key": hbKey },
              });

              if (!statusResp.ok) continue;
              const statusData = await statusResp.json();

              push({
                status: statusData.currentStep || "Working...",
                browser: {
                  screenshotUrl: statusData.screenshotUrl || statusData.latestScreenshot,
                  liveUrl: statusData.liveUrl || statusData.sessionUrl,
                },
              });

              if (statusData.status === "completed" || statusData.status === "finished" || statusData.status === "done") {
                push({ status: "Task completed", result: statusData.output || statusData.result });
                break;
              }
              if (statusData.status === "failed" || statusData.status === "error") {
                push({ status: "Task failed", error: "The automation encountered an error. Please try again." });
                break;
              }
            } catch { continue; }
          }
        } catch (err) {
          push({ status: "Error", error: "An unexpected error occurred. Please try again." });
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
