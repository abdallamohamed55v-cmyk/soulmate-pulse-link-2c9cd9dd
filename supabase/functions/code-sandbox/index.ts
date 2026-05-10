import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FLY_API_BASE = "https://api.machines.dev/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FLY_API_TOKEN = Deno.env.get("FLY_API_TOKEN");
    if (!FLY_API_TOKEN) throw new Error("FLY_API_TOKEN not configured");

    const { action, app_name, machine_id, file_path, file_content, command } = await req.json();
    const headers = {
      Authorization: `Bearer ${FLY_API_TOKEN}`,
      "Content-Type": "application/json",
    };

    let result: Record<string, unknown> = {};

    switch (action) {
      case "create-app": {
        // Create a Fly app
        const orgSlug = "personal";
        const appResp = await fetch(`${FLY_API_BASE}/apps`, {
          method: "POST",
          headers,
          body: JSON.stringify({ app_name, org_slug: orgSlug }),
        });
        if (!appResp.ok) {
          const err = await appResp.text();
          throw new Error(`Failed to create app: ${appResp.status} ${err}`);
        }
        result = await appResp.json();
        break;
      }

      case "create-machine": {
        // Create a Fly Machine with Node.js
        const machineResp = await fetch(`${FLY_API_BASE}/apps/${app_name}/machines`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            config: {
              image: "node:20-slim",
              guest: { cpu_kind: "shared", cpus: 1, memory_mb: 512 },
              services: [
                {
                  ports: [
                    { port: 443, handlers: ["tls", "http"], force_https: true },
                    { port: 80, handlers: ["http"] },
                  ],
                  protocol: "tcp",
                  internal_port: 5173,
                },
              ],
              auto_destroy: true,
              restart: { policy: "no" },
            },
          }),
        });
        if (!machineResp.ok) {
          const err = await machineResp.text();
          throw new Error(`Failed to create machine: ${machineResp.status} ${err}`);
        }
        result = await machineResp.json();
        break;
      }

      case "exec": {
        // Execute a command on the machine
        const execResp = await fetch(
          `${FLY_API_BASE}/apps/${app_name}/machines/${machine_id}/exec`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              cmd: ["sh", "-c", command],
              timeout: 120,
            }),
          }
        );
        if (!execResp.ok) {
          const err = await execResp.text();
          throw new Error(`Exec failed: ${execResp.status} ${err}`);
        }
        result = await execResp.json();
        break;
      }

      case "write-file": {
        // Write file content via exec (base64 encode to avoid escaping issues)
        const b64 = btoa(unescape(encodeURIComponent(file_content)));
        const cmd = `mkdir -p $(dirname /app/${file_path}) && echo '${b64}' | base64 -d > /app/${file_path}`;
        const writeResp = await fetch(
          `${FLY_API_BASE}/apps/${app_name}/machines/${machine_id}/exec`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              cmd: ["sh", "-c", cmd],
              timeout: 30,
            }),
          }
        );
        if (!writeResp.ok) {
          const err = await writeResp.text();
          throw new Error(`Write file failed: ${writeResp.status} ${err}`);
        }
        result = await writeResp.json();
        break;
      }

      case "write-files": {
        // Write multiple files at once
        const { files } = await req.json();
        for (const f of files as { path: string; content: string }[]) {
          const b64 = btoa(unescape(encodeURIComponent(f.content)));
          const cmd = `mkdir -p $(dirname /app/${f.path}) && echo '${b64}' | base64 -d > /app/${f.path}`;
          await fetch(
            `${FLY_API_BASE}/apps/${app_name}/machines/${machine_id}/exec`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({ cmd: ["sh", "-c", cmd], timeout: 30 }),
            }
          );
        }
        result = { success: true };
        break;
      }

      case "status": {
        const statusResp = await fetch(
          `${FLY_API_BASE}/apps/${app_name}/machines/${machine_id}`,
          { headers }
        );
        if (!statusResp.ok) throw new Error(`Status check failed: ${statusResp.status}`);
        result = await statusResp.json();
        break;
      }

      case "destroy": {
        const stopResp = await fetch(
          `${FLY_API_BASE}/apps/${app_name}/machines/${machine_id}/stop`,
          { method: "POST", headers }
        );
        // Ignore stop errors, try destroy anyway
        await new Promise((r) => setTimeout(r, 2000));
        const destroyResp = await fetch(
          `${FLY_API_BASE}/apps/${app_name}/machines/${machine_id}`,
          { method: "DELETE", headers, body: JSON.stringify({ force: true }) }
        );
        result = { stopped: stopResp.ok, destroyed: destroyResp.ok };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("code-sandbox error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
