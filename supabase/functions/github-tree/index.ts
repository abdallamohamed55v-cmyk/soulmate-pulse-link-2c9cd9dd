import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * github-tree
 * Fetches repository structure and reads file contents using GITHUB_PAT.
 * Used by the Claude-Code-style code-agent.
 *
 * Actions:
 *   - { action: "tree", repo: "owner/name", branch?: "main" }
 *   - { action: "read", repo: "owner/name", path: "src/App.tsx", branch?: "main" }
 *   - { action: "search", repo: "owner/name", q: "useState" }
 *   - { action: "list_repos" }   // user repos accessible to the PAT
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const pat = Deno.env.get("GITHUB_PAT");
  if (!pat) {
    return new Response(JSON.stringify({ success: false, error: "GITHUB_PAT missing" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const headers = {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Megsy-Code-Agent",
  };

  try {
    const { action, repo, branch = "main", path, q } = await req.json();

    if (action === "list_repos") {
      const r = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", { headers });
      const data = await r.json();
      const repos = Array.isArray(data) ? data.map((x: { full_name: string; description?: string; default_branch?: string; updated_at?: string; private?: boolean }) => ({
        full_name: x.full_name, description: x.description, default_branch: x.default_branch, updated_at: x.updated_at, private: x.private,
      })) : [];
      return new Response(JSON.stringify({ success: true, repos }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!repo) throw new Error("repo required");

    if (action === "tree") {
      // get default branch sha
      const repoR = await fetch(`https://api.github.com/repos/${repo}`, { headers });
      const repoData = await repoR.json();
      const useBranch = branch || repoData?.default_branch || "main";

      const refR = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${useBranch}`, { headers });
      const refData = await refR.json();
      const sha = refData?.object?.sha;
      if (!sha) throw new Error("Branch sha not found");

      const treeR = await fetch(`https://api.github.com/repos/${repo}/git/trees/${sha}?recursive=1`, { headers });
      const treeData = await treeR.json();
      const tree = (treeData?.tree ?? []).map((n: { path: string; type: string; size?: number }) => ({
        path: n.path, type: n.type, size: n.size,
      }));
      return new Response(JSON.stringify({ success: true, branch: useBranch, tree }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "read") {
      if (!path) throw new Error("path required");
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`, { headers });
      const data = await r.json();
      if (!data?.content) throw new Error("File not found");
      const content = atob(String(data.content).replace(/\n/g, ""));
      return new Response(JSON.stringify({ success: true, path, content, sha: data.sha }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "search") {
      if (!q) throw new Error("q required");
      const r = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(q + ` repo:${repo}`)}`, { headers });
      const data = await r.json();
      const items = (data?.items ?? []).slice(0, 20).map((x: { path: string; html_url: string }) => ({ path: x.path, url: x.html_url }));
      return new Response(JSON.stringify({ success: true, items }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("github-tree error", e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
