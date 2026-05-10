import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPRITES_API = "https://api.sprites.dev/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SPRITES_TOKEN = Deno.env.get("SPRITES_TOKEN");
    if (!SPRITES_TOKEN) throw new Error("SPRITES_TOKEN not configured");

    const body = await req.json();
    const { action, sprite_name, file_path, file_content, command, detach } = body;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${SPRITES_TOKEN}`,
    };

    let result: Record<string, unknown> = {};

    switch (action) {
      case "create": {
        // Create a new sprite with public URL access
        const name = sprite_name || `megsy-${Date.now()}`;
        const resp = await fetch(`${SPRITES_API}/sprites`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            url_settings: { auth: "public" },
          }),
        });
        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(`Failed to create sprite: ${resp.status} ${err}`);
        }
        result = await resp.json();
        break;
      }

      case "exec": {
        // Execute command via shell so chaining (&&, |, redirects) works reliably
        const url = new URL(`${SPRITES_API}/sprites/${sprite_name}/exec`);
        url.searchParams.append("cmd", "bash");
        url.searchParams.append("cmd", "-lc");
        url.searchParams.append("cmd", command);
        url.searchParams.set("stdin", "false");

        // Keep long-running commands alive after disconnect
        const keepAlive = command.includes("npm run dev") || command.includes("nohup") || command.includes("npm install") ? "24h" : "30m";
        url.searchParams.set("max_run_after_disconnect", keepAlive);

        const resp = await fetch(url.toString(), {
          method: "POST",
          headers,
        });
        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(`Exec failed: ${resp.status} ${err}`);
        }

        if (detach === true) {
          await resp.body?.cancel();
          result = { success: true, detached: true };
          break;
        }

        const text = await resp.text();
        const output = text.length > 12000
          ? `${text.slice(0, 6000)}\n... [output truncated] ...\n${text.slice(-6000)}`
          : text;

        // Surface obvious command errors to caller so UI doesn't mark build as successful
        if (/not found|command not found|No such file or directory|npm ERR!/i.test(output)) {
          throw new Error(`Exec command failed: ${output}`);
        }

        result = { output, success: true };
        break;
      }

      case "write-file": {
        // Write a file using the filesystem API
        const url = new URL(`${SPRITES_API}/sprites/${sprite_name}/fs/write`);
        url.searchParams.set("path", file_path);
        url.searchParams.set("workingDir", "/");
        url.searchParams.set("mkdir", "true");

        const encoder = new TextEncoder();
        const resp = await fetch(url.toString(), {
          method: "PUT",
          headers: {
            ...headers,
            "Content-Type": "application/octet-stream",
          },
          body: encoder.encode(file_content),
        });
        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(`Write file failed: ${resp.status} ${err}`);
        }
        result = { success: true, path: file_path };
        break;
      }

      case "write-files": {
        // Write multiple files
        const { files } = body;
        for (const f of files as { path: string; content: string }[]) {
          const url = new URL(`${SPRITES_API}/sprites/${sprite_name}/fs/write`);
          url.searchParams.set("path", f.path);
          url.searchParams.set("workingDir", "/");
          url.searchParams.set("mkdir", "true");

          const encoder = new TextEncoder();
          const resp = await fetch(url.toString(), {
            method: "PUT",
            headers: {
              ...headers,
              "Content-Type": "application/octet-stream",
            },
            body: encoder.encode(f.content),
          });
          if (!resp.ok) {
            console.error(`Failed to write ${f.path}: ${resp.status}`);
          }
        }
        result = { success: true };
        break;
      }

      case "status": {
        const resp = await fetch(`${SPRITES_API}/sprites/${sprite_name}`, {
          headers,
        });
        if (!resp.ok) throw new Error(`Status check failed: ${resp.status}`);
        result = await resp.json();
        break;
      }

      case "destroy": {
        const resp = await fetch(`${SPRITES_API}/sprites/${sprite_name}`, {
          method: "DELETE",
          headers,
        });
        result = { destroyed: resp.ok };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sprites-sandbox error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
