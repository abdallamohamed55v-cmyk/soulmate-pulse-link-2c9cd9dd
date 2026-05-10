import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * code-agent — Claude-Code / clow-bot style orchestrator.
 * Uses ONLY z-ai/glm-4.5-air:free with silent OpenRouter fallback chain.
 * Performs iterative tool-calling: read_file, list_dir, search_code, write_file.
 * Streams an "activity log" of each step back to the client.
 */
const MODEL_CHAIN = [
  "z-ai/glm-4.5-air:free",
  "deepseek/deepseek-chat-v3.1:free",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.0-flash-001",
];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string };

async function callAI(messages: Msg[], tools: unknown[]): Promise<{ content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> }> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) throw new Error("OPENROUTER_API_KEY missing");

  let lastErr: unknown = null;
  for (const model of MODEL_CHAIN) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60_000);
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://megsyai.com",
          "X-Title": "Megsy Code Agent",
        },
        body: JSON.stringify({ model, messages, tools, tool_choice: "auto" }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t));

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.warn(`[code-agent:${model}] ${r.status}: ${txt.slice(0, 160)}`);
        lastErr = new Error(`${r.status}`);
        continue;
      }
      const d = await r.json();
      return d?.choices?.[0]?.message ?? {};
    } catch (e) {
      console.warn(`[code-agent:${model}] error`, e);
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All providers failed");
}

async function runTool(name: string, args: Record<string, unknown>, repo: string): Promise<string> {
  const tree = async (action: string, body: Record<string, unknown>) => {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/github-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}`, apikey: ANON },
      body: JSON.stringify({ action, repo, ...body }),
    });
    return r.json();
  };

  switch (name) {
    case "list_repo": {
      const d = await tree("tree", {});
      const paths = (d?.tree ?? []).filter((n: { type: string }) => n.type === "blob").map((n: { path: string }) => n.path).slice(0, 200);
      return JSON.stringify({ files: paths });
    }
    case "read_file":
      return JSON.stringify(await tree("read", { path: args.path }));
    case "search_code":
      return JSON.stringify(await tree("search", { q: args.q }));
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

const TOOLS = [
  { type: "function", function: { name: "list_repo", description: "List all files in the connected GitHub repository", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "read_file", description: "Read the contents of a single file in the repo", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
  { type: "function", function: { name: "search_code", description: "Search for a string across the repo", parameters: { type: "object", properties: { q: { type: "string" } }, required: ["q"] } } },
];

const SYSTEM = `You are a Claude-Code style autonomous coding agent for the Megsy platform.
You can call tools to inspect the user's GitHub repository before answering.
Workflow:
1. If the question requires repo context, call list_repo first.
2. Read 1-3 most relevant files with read_file.
3. Optionally use search_code for cross-cutting symbols.
4. Then answer with a focused, code-first response.
Be concise. Show real file paths. Use markdown code fences with language hints.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, repo, history } = await req.json();
    if (!question) throw new Error("question required");

    const activity: Array<{ step: string; detail?: string }> = [];
    const messages: Msg[] = [
      { role: "system", content: SYSTEM + (repo ? `\n\nConnected repository: ${repo}` : "\n\nNo repository connected. Answer from general knowledge.") },
      ...(Array.isArray(history) ? history.slice(-6) : []),
      { role: "user", content: question },
    ];

    for (let i = 0; i < 5; i++) {
      activity.push({ step: i === 0 ? "analyzing request" : `iteration ${i + 1}` });
      const reply = await callAI(messages, repo ? TOOLS : []);

      if (reply.tool_calls?.length) {
        messages.push({ role: "assistant", content: reply.content || "" });
        for (const tc of reply.tool_calls) {
          activity.push({ step: `tool: ${tc.function.name}`, detail: tc.function.arguments });
          let parsed: Record<string, unknown> = {};
          try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch { /* */ }
          const result = await runTool(tc.function.name, parsed, repo || "");
          messages.push({ role: "tool", tool_call_id: tc.id, name: tc.function.name, content: result.slice(0, 4000) });
        }
        continue;
      }

      activity.push({ step: "response ready" });
      return new Response(JSON.stringify({
        success: true,
        answer: reply.content || "",
        activity,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      answer: "I gathered enough context but ran out of iterations — try refining your question.",
      activity,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("code-agent error", e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
