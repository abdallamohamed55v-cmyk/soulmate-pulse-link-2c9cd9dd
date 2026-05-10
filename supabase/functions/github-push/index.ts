// GitHub push: creates a new repo on the user's account and pushes project files.
// Uses per-user OAuth token from `code_integrations` (provider='github').
// Falls back to GITHUB_PAT only if no per-user token exists (legacy behavior).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROMO_README = (projectName: string, description: string) => `# ${projectName}

${description || "An AI-generated web project."}

---

> Built with [Megsy AI](https://megsyai.com) — turn any idea into a working web app in seconds.
> Visit https://megsyai.com to build your own.
`;

async function gh(token: string, path: string, init: RequestInit = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { user_id, project_name, description, files } = body;

    if (!user_id || !files || typeof files !== "object") {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Try per-user GitHub token first
    const { data: integration } = await supabase
      .from("code_integrations")
      .select("config")
      .eq("user_id", user_id)
      .eq("provider", "github")
      .maybeSingle();

    const userToken = integration?.config?.access_token;
    const fallback = Deno.env.get("GITHUB_PAT");
    const token = userToken || fallback;
    const usingPersonal = !!userToken;

    if (!token) {
      return new Response(JSON.stringify({ error: "GitHub not connected", needs_oauth: true }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the user's GitHub login (so we can create repo under their account when using user token)
    let owner: string | null = null;
    if (usingPersonal) {
      const meResp = await gh(token, "/user");
      if (meResp.ok) {
        const me = await meResp.json();
        owner = me.login;
      }
    }

    const repoName = (project_name || "megsy-project")
      .toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "")
      .slice(0, 80) || "megsy-project";

    // Create repository
    const createResp = await gh(token, "/user/repos", {
      method: "POST",
      body: JSON.stringify({
        name: repoName,
        description: description?.slice(0, 350) || "Built with Megsy AI — https://megsyai.com",
        private: false,
        auto_init: true,
      }),
    });

    if (!createResp.ok && createResp.status !== 422) {
      const errTxt = await createResp.text();
      return new Response(JSON.stringify({ error: "Could not create repository", detail: errTxt.slice(0, 200) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const created = createResp.ok ? await createResp.json() : null;
    const repoOwner = created?.owner?.login || owner;
    const repoFullName = created?.full_name || (repoOwner ? `${repoOwner}/${repoName}` : null);
    if (!repoFullName) {
      return new Response(JSON.stringify({ error: "Could not resolve repo path" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wait briefly for auto_init to settle
    await new Promise(r => setTimeout(r, 1200));

    const allFiles: Record<string, string> = {
      ...files,
      "README.md": PROMO_README(project_name || "Megsy Project", description || ""),
    };

    // Get the default branch ref
    const branchResp = await gh(token, `/repos/${repoFullName}`);
    const repo = await branchResp.json();
    const defaultBranch = repo.default_branch || "main";

    // Push each file via Contents API (simple, no git tree juggling)
    let pushed = 0;
    for (const [path, content] of Object.entries(allFiles)) {
      // First check if file exists to get sha
      const checkResp = await gh(token, `/repos/${repoFullName}/contents/${encodeURIComponent(path)}?ref=${defaultBranch}`);
      const existing = checkResp.ok ? await checkResp.json() : null;

      const putResp = await gh(token, `/repos/${repoFullName}/contents/${encodeURIComponent(path)}`, {
        method: "PUT",
        body: JSON.stringify({
          message: pushed === 0 ? "Initial commit from Megsy AI" : `Add ${path}`,
          content: btoa(unescape(encodeURIComponent(content))),
          branch: defaultBranch,
          ...(existing?.sha ? { sha: existing.sha } : {}),
        }),
      });
      if (putResp.ok) pushed++;
    }

    const repoUrl = `https://github.com/${repoFullName}`;

    return new Response(JSON.stringify({ ok: true, repo_url: repoUrl, pushed }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Push failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
