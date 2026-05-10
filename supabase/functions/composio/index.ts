import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COMPOSIO_BASE = "https://backend.composio.dev/api/v1";

async function getOrCreateIntegration(app: string, headers: Record<string, string>) {
  // 1. Try to find existing integration
  const intResp = await fetch(`${COMPOSIO_BASE}/integrations?appName=${encodeURIComponent(app)}`, { headers });
  if (intResp.ok) {
    const intData = await intResp.json();
    const items = intData.items || intData;
    if (Array.isArray(items) && items.length > 0) {
      return items[0];
    }
  } else {
    const t = await intResp.text();
    console.log(`Get integrations response [${intResp.status}]: ${t}`);
  }

  // 2. No integration found — get the app ID first
  console.log(`No integration found for ${app}, creating one...`);
  const appsResp = await fetch(`${COMPOSIO_BASE}/apps?name=${encodeURIComponent(app)}`, { headers });
  if (!appsResp.ok) {
    const t = await appsResp.text();
    throw new Error(`Failed to get app info for ${app} [${appsResp.status}]: ${t}`);
  }
  const appsData = await appsResp.json();
  const appsList = appsData.items || appsData;
  const appInfo = Array.isArray(appsList) ? appsList.find((a: any) => 
    (a.name || "").toLowerCase() === app.toLowerCase() || 
    (a.key || "").toLowerCase() === app.toLowerCase()
  ) || appsList[0] : null;

  if (!appInfo) {
    throw new Error(`App '${app}' not found in Composio. Make sure the app name is correct.`);
  }

  // 3. Create integration with Composio's default auth
  const createResp = await fetch(`${COMPOSIO_BASE}/integrations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      appId: appInfo.appId || appInfo.id,
      name: `${app}_default`,
      useComposioAuth: true,
    }),
  });

  if (!createResp.ok) {
    const t = await createResp.text();
    throw new Error(`Failed to create integration for ${app} [${createResp.status}]: ${t}`);
  }

  const integration = await createResp.json();
  console.log(`Created integration for ${app}: ${integration.id}`);
  return integration;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const COMPOSIO_API_KEY = Deno.env.get("COMPOSIO_API_KEY");
    if (!COMPOSIO_API_KEY) throw new Error("COMPOSIO_API_KEY is not configured");

    const { action, app, userId, tool, args, connectedAccountId, connectionId } = await req.json();

    const headers = {
      "x-api-key": COMPOSIO_API_KEY,
      "Content-Type": "application/json",
    };

    // List connected accounts for a user
    if (action === "list-connections") {
      const resp = await fetch(`${COMPOSIO_BASE}/connectedAccounts?user_uuid=${encodeURIComponent(userId || "default")}`, { headers });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Composio list-connections failed [${resp.status}]: ${t}`);
      }
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initiate a new connection
    if (action === "connect") {
      if (!app) throw new Error("app is required for connect action");

      const integration = await getOrCreateIntegration(app, headers);

      // Initiate connection using v1 API
      const redirectUri = `${req.headers.get("origin") || "https://megsyai.com"}/settings/integrations`;
      const connResp = await fetch(`${COMPOSIO_BASE}/connectedAccounts`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          integrationId: integration.id,
          userUuid: userId || "default",
          redirectUri: redirectUri,
          data: {},
        }),
      });
      if (!connResp.ok) {
        const t = await connResp.text();
        throw new Error(`Composio connect failed [${connResp.status}]: ${t}`);
      }
      const connData = await connResp.json();
      return new Response(JSON.stringify(connData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Execute a tool action
    if (action === "execute") {
      if (!tool) throw new Error("tool is required for execute action");
      if (!connectedAccountId) throw new Error("connectedAccountId is required for execute action");

      const execResp = await fetch(`${COMPOSIO_BASE}/actions/${encodeURIComponent(tool)}/execute`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          connectedAccountId,
          input: args || {},
        }),
      });
      if (!execResp.ok) {
        const t = await execResp.text();
        throw new Error(`Composio execute failed [${execResp.status}]: ${t}`);
      }
      const execData = await execResp.json();
      return new Response(JSON.stringify(execData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get available actions for an app
    if (action === "get-actions") {
      if (!app) throw new Error("app is required for get-actions");
      const resp = await fetch(`${COMPOSIO_BASE}/actions?appNames=${encodeURIComponent(app)}&limit=20`, { headers });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Composio get-actions failed [${resp.status}]: ${t}`);
      }
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Disconnect a connected account
    if (action === "disconnect") {
      if (!connectionId) throw new Error("connectionId is required for disconnect action");

      const resp = await fetch(`${COMPOSIO_BASE}/connectedAccounts/${encodeURIComponent(connectionId)}`, {
        method: "DELETE",
        headers,
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Composio disconnect failed [${resp.status}]: ${t}`);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("composio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
