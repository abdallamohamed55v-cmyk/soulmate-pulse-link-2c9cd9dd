import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VERCEL_TOKEN = Deno.env.get("VERCEL_TOKEN");
    if (!VERCEL_TOKEN) {
      return new Response(JSON.stringify({ error: "VERCEL_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { files, project_name } = await req.json();

    if (!files || typeof files !== "object") {
      return new Response(JSON.stringify({ error: "No files provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert files to Vercel deployment format
    const vercelFiles = Object.entries(files).map(([path, content]) => ({
      file: path,
      data: btoa(unescape(encodeURIComponent(content as string))),
      encoding: "base64",
    }));

    const deployName = project_name || `megsy-${Date.now()}`;

    // Create deployment via Vercel API v13
    const deployResp = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
      body: JSON.stringify({
        name: deployName.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 52),
        files: vercelFiles,
        projectSettings: {
          framework: "vite",
          installCommand: "npm install",
          buildCommand: "npm run build",
          outputDirectory: "dist",
        },
        target: "production",
      }),
    });

    if (!deployResp.ok) {
      const errBody = await deployResp.text();
      console.error("Vercel API error:", errBody);
      return new Response(JSON.stringify({ error: "Vercel deployment failed", details: errBody }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deployData = await deployResp.json();

    return new Response(JSON.stringify({
      success: true,
      url: `https://${deployData.url}`,
      deployment_id: deployData.id,
      ready_state: deployData.readyState,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Deploy error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
