import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HB_BASE = "https://api.hyperbrowser.ai";
const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedHBKey: { id: string; api_key: string } | null = null;
let cachedHBKeyExpiry = 0;

async function getHyperbrowserKey(sb: any, excludeId?: string): Promise<{ id: string; api_key: string } | null> {
  if (cachedHBKey && Date.now() < cachedHBKeyExpiry && cachedHBKey.id !== excludeId) return cachedHBKey;
  const { data } = await sb.from("api_keys").select("id, api_key").eq("service", "hyperbrowser").eq("is_active", true).eq("is_blocked", false).limit(20);
  if (!data || data.length === 0) {
    // Auto-reactivate keys blocked more than 30 minutes ago
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: reactivated } = await sb.from("api_keys")
      .update({ is_blocked: false, block_reason: null })
      .eq("service", "hyperbrowser")
      .eq("is_active", true)
      .eq("is_blocked", true)
      .lt("last_error_at", thirtyMinAgo)
      .select("id, api_key");
    if (reactivated && reactivated.length > 0) {
      console.log(`Auto-reactivated ${reactivated.length} HB key(s)`);
      const pick = reactivated[Math.floor(Math.random() * reactivated.length)];
      cachedHBKey = pick;
      cachedHBKeyExpiry = Date.now() + CACHE_TTL_MS;
      return pick;
    }
    return null;
  }
  const pool = excludeId ? data.filter((k: any) => k.id !== excludeId) : data;
  if (pool.length === 0) return null;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  cachedHBKey = pick;
  cachedHBKeyExpiry = Date.now() + CACHE_TTL_MS;
  return pick;
}

function blockHBKey(sb: any, keyId: string, reason: string) {
  if (cachedHBKey?.id === keyId) cachedHBKey = null;
  sb.from("api_keys").update({ is_blocked: true, block_reason: reason, last_error_at: new Date().toISOString() }).eq("id", keyId).then(() => {});
}

function markHBKeyUsed(sb: any, keyId: string) {
  sb.from("api_keys").update({ last_used_at: new Date().toISOString(), usage_count: 1 }).eq("id", keyId).then(() => {});
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { goal, url } = await req.json();
    
    if (!goal && !url) {
      return new Response(JSON.stringify({ error: "Missing goal or url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    let hbKey = await getHyperbrowserKey(sb);
    if (!hbKey) {
      return new Response(JSON.stringify({ error: "No Hyperbrowser keys available", needsKey: true }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const task = url ? `Go to ${url} and ${goal || "extract the main content"}` : goal;
    
    const stream = new ReadableStream({
      async start(controller) {
        const pushStatus = (status: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status })}\n\n`));
        };
        const pushData = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        let retries = 0;
        const MAX_RETRIES = 2;

        while (retries <= MAX_RETRIES) {
          try {
            pushStatus("Opening smart browser...");
            
            // Start task using HyperAgent async API
            const startResp = await fetch(`${HB_BASE}/api/task/hyper-agent`, {
              method: "POST",
              headers: {
                "x-api-key": hbKey!.api_key,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                task,
                maxSteps: 20,
                keepBrowserOpen: false,
              }),
            });

            if (!startResp.ok) {
              const errText = await startResp.text();
              if ((startResp.status === 401 || startResp.status === 403) && retries < MAX_RETRIES) {
                blockHBKey(sb, hbKey!.id, `HTTP ${startResp.status}`);
                const newKey = await getHyperbrowserKey(sb, hbKey!.id);
                if (newKey) {
                  hbKey = newKey;
                  retries++;
                  continue;
                }
              }
              throw new Error(`Task start failed: ${startResp.status} ${errText}`);
            }

            const startData = await startResp.json();
            const jobId = startData.jobId;
            if (!jobId) throw new Error("No jobId returned");
            
            markHBKeyUsed(sb, hbKey!.id);
            pushStatus("Browser opened — executing task...");
            if (url) pushStatus(`Navigating to ${new URL(url).hostname}...`);

            // Poll for status with live step streaming
            let lastStepCount = 0;
            let pollCount = 0;
            const MAX_POLLS = 90; // 3 minutes max (2s intervals)
            let finalResult: any = null;

            while (pollCount < MAX_POLLS) {
              await delay(2000);
              pollCount++;

              const statusResp = await fetch(`${HB_BASE}/api/task/hyper-agent/${jobId}/status`, {
                headers: { "x-api-key": hbKey!.api_key },
              });

              if (!statusResp.ok) {
                pushStatus("Checking progress...");
                continue;
              }

              const statusData = await statusResp.json();
              const status = statusData.status;

              // Stream new steps as they appear
              if (statusData.steps && Array.isArray(statusData.steps)) {
                const newSteps = statusData.steps.slice(lastStepCount);
                for (const step of newSteps) {
                  const desc = step.description || step.next_goal || step.action || "";
                  const stepUrl = step.url || "";
                  if (desc) {
                    const stepMsg = stepUrl 
                      ? `${desc} — ${stepUrl}` 
                      : desc;
                    pushStatus(stepMsg);
                  }
                }
                lastStepCount = statusData.steps.length;
              }

              // Check current URL being browsed
              if (statusData.currentUrl && pollCount % 3 === 0) {
                pushStatus(`Currently on: ${statusData.currentUrl}`);
              }

              if (status === "completed" || status === "finished" || status === "done") {
                finalResult = statusData;
                break;
              }

              if (status === "failed" || status === "error") {
                throw new Error(statusData.error || "Task failed");
              }

              // Show progress indicator periodically
              if (pollCount % 5 === 0 && !statusData.steps?.length) {
                pushStatus("Still working...");
              }
            }

            if (!finalResult && pollCount >= MAX_POLLS) {
              pushStatus("Task timed out — retrieving partial results...");
              // Try to get final status one more time
              const finalResp = await fetch(`${HB_BASE}/api/task/hyper-agent/${jobId}/status`, {
                headers: { "x-api-key": hbKey!.api_key },
              });
              if (finalResp.ok) finalResult = await finalResp.json();
            }

            pushStatus("Browsing completed");

            const output = finalResult?.output || finalResult?.result || finalResult;
            const steps = finalResult?.steps?.map((s: any) => s.description || s.next_goal).filter(Boolean) || [];

            pushData({
              type: "browser_result",
              result: typeof output === 'string' ? output : JSON.stringify(output, null, 2),
              steps,
            });

            break; // Success

          } catch (err) {
            console.error(`Computer-use attempt ${retries + 1} error:`, err);
            if (retries >= MAX_RETRIES) {
              pushData({
                type: "browser_error",
                error: err instanceof Error ? err.message : "Unknown browser error",
              });
            }
            retries++;
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("Computer-use error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
