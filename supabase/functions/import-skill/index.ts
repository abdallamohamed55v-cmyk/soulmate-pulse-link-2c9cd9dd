// Import a Skill package (.zip with SKILL.md + optional reference files).
// Pattern follows Claude's Agent Skills: SKILL.md has YAML frontmatter
// (name, description, triggers[], tools[]) followed by markdown instructions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { unzipSync, strFromU8 } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function parseFrontmatter(text: string): { meta: Record<string, any>; body: string } {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const yaml = m[1];
  const body = m[2];
  const meta: Record<string, any> = {};
  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value: any = line.slice(idx + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, "");
    }
    meta[key] = value;
  }
  return { meta, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return ok({ error: "method_not_allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return ok({ error: "unauthorized" }, 401);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return ok({ error: "file_missing" }, 400);
    if (file.size > 10 * 1024 * 1024) return ok({ error: "file_too_large" }, 400);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const entries = unzipSync(bytes);

    // Find SKILL.md (case-insensitive, allow nested top-level folder)
    let skillKey: string | null = null;
    for (const k of Object.keys(entries)) {
      if (/(^|\/)SKILL\.md$/i.test(k)) {
        skillKey = k;
        break;
      }
    }
    if (!skillKey) return ok({ error: "skill_md_missing" }, 400);

    const baseDir = skillKey.replace(/SKILL\.md$/i, "");
    const skillText = strFromU8(entries[skillKey]);
    const { meta, body } = parseFrontmatter(skillText);

    const name = String(meta.name || "Imported Skill").slice(0, 80);
    const description = String(meta.description || "").slice(0, 280);
    const triggers: string[] = Array.isArray(meta.triggers) ? meta.triggers.slice(0, 12).map(String) : [];
    const enabledTools: string[] = Array.isArray(meta.tools) ? meta.tools.slice(0, 16).map(String) : [];

    // Insert skill
    const { data: skill, error: skErr } = await sb
      .from("skills")
      .insert({
        user_id: user.id,
        name,
        description,
        instructions: body.slice(0, 6000),
        body: body.slice(0, 60000),
        triggers,
        enabled_tools: enabledTools,
        is_enabled: true,
      })
      .select("id")
      .single();
    if (skErr || !skill) return ok({ error: skErr?.message || "insert_failed" }, 500);

    // Upload reference files
    const uploaded: { path: string; size: number }[] = [];
    for (const [key, content] of Object.entries(entries)) {
      if (key === skillKey) continue;
      if (key.endsWith("/")) continue;
      const relPath = key.startsWith(baseDir) ? key.slice(baseDir.length) : key;
      if (!relPath) continue;
      if (content.length > 2 * 1024 * 1024) continue;
      const storagePath = `${user.id}/${skill.id}/${relPath}`;
      const mime = relPath.endsWith(".md") ? "text/markdown"
        : relPath.endsWith(".json") ? "application/json"
        : relPath.endsWith(".txt") ? "text/plain"
        : "application/octet-stream";
      const up = await sb.storage.from("skill-files").upload(storagePath, content, {
        contentType: mime,
        upsert: true,
      });
      if (up.error) continue;
      await sb.from("skill_files").insert({
        skill_id: skill.id,
        user_id: user.id,
        path: relPath,
        storage_path: storagePath,
        size_bytes: content.length,
        mime_type: mime,
      });
      uploaded.push({ path: relPath, size: content.length });
    }

    return ok({ skill_id: skill.id, name, files: uploaded });
  } catch (e) {
    return ok({ error: String((e as Error).message || e) }, 500);
  }
});
