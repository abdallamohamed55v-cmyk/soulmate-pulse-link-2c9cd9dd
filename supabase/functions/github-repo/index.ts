import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GITHUB_PAT = Deno.env.get("GITHUB_PAT");
    if (!GITHUB_PAT) throw new Error("GITHUB_PAT not configured");

    const { action, repo_name, files, description, project_name } = await req.json();

    const ghHeaders = {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    // Get authenticated user
    const userResp = await fetch("https://api.github.com/user", { headers: ghHeaders });
    if (!userResp.ok) throw new Error("Invalid GitHub token");
    const ghUser = await userResp.json();
    const owner = ghUser.login;

    if (action === "check-connection") {
      return new Response(
        JSON.stringify({ connected: true, username: owner }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "auto-create-push") {
      // Auto create repo and push all files
      const repoName = `megsy-${(project_name || "project").slice(0, 20)}-${Date.now().toString(36)}`;
      
      // 1. Create repo
      const createResp = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({
          name: repoName,
          description: description || "Created by Megsy Code",
          private: false,
          auto_init: true,
        }),
      });
      if (!createResp.ok) {
        const err = await createResp.text();
        throw new Error(`Failed to create repo: ${err}`);
      }
      const repo = await createResp.json();

      // Wait for repo init
      await new Promise(r => setTimeout(r, 2000));

      // 2. Push files using GitHub Trees API (single commit)
      // Get the default branch SHA
      const refResp = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/main`, { headers: ghHeaders });
      if (!refResp.ok) throw new Error("Failed to get branch ref");
      const refData = await refResp.json();
      const baseSha = refData.object.sha;

      // Create blobs for each file
      const tree: { path: string; mode: string; type: string; sha: string }[] = [];
      for (const file of (files as { path: string; content: string }[])) {
        const blobResp = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/blobs`, {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
        });
        if (!blobResp.ok) continue;
        const blob = await blobResp.json();
        tree.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
      }

      // Create tree
      const treeResp = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees`, {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ base_tree: baseSha, tree }),
      });
      if (!treeResp.ok) throw new Error("Failed to create tree");
      const treeData = await treeResp.json();

      // Create commit
      const commitResp = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/commits`, {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({
          message: "Initial project from Megsy Code",
          tree: treeData.sha,
          parents: [baseSha],
        }),
      });
      if (!commitResp.ok) throw new Error("Failed to create commit");
      const commitData = await commitResp.json();

      // Update ref
      await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/main`, {
        method: "PATCH",
        headers: ghHeaders,
        body: JSON.stringify({ sha: commitData.sha }),
      });

      return new Response(
        JSON.stringify({ success: true, repo_url: repo.html_url, repo_name: repoName }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create-repo") {
      const createResp = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({
          name: repo_name,
          description: description || "Created by Megsy Code",
          private: false,
          auto_init: true,
        }),
      });
      const data = await createResp.json();
      if (!createResp.ok) throw new Error(`GitHub error: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "push-files") {
      const results = [];
      for (const file of files as { path: string; content: string }[]) {
        const b64Content = btoa(unescape(encodeURIComponent(file.content)));
        const resp = await fetch(
          `https://api.github.com/repos/${owner}/${repo_name}/contents/${file.path}`,
          {
            method: "PUT",
            headers: ghHeaders,
            body: JSON.stringify({
              message: `Add ${file.path}`,
              content: b64Content,
            }),
          }
        );
        const data = await resp.json();
        results.push({ path: file.path, success: resp.ok, data });
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("github-repo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
