// Phase 2: mem0-style passive memory + Knowledge Graph extraction.
// Called from the client after each user/assistant exchange.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_message, assistant_reply, conversation_id, message_id } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ ok: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    let userId: string | null = null;
    if (token) {
      try {
        const { data } = await sb.auth.getUser(token);
        userId = data?.user?.id || null;
      } catch {}
    }
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "no_auth" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sys = `You are a memory extractor. From a single user/assistant exchange, extract:
1) "facts" — durable personal facts about THIS USER worth remembering across sessions (preferences, identity, goals, recurring tasks, opinions, important dates, dislikes, ongoing projects). Skip ephemeral chit-chat. Each fact must be a self-contained sentence in the user's language. importance: 1=trivial, 5=critical.
2) "triples" — knowledge graph triples (entity, relation, target_entity) capturing relationships, e.g. ("user","works_at","Megsy"), ("user","likes","Arabic poetry"), ("Salah","plays_for","Liverpool"). Use snake_case relations.

Return [] for either if nothing worth saving. Quality > quantity. Max 5 facts, 8 triples per call.`;

    const res = await fetch(LOVABLE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `USER:\n${(user_message || "").slice(0, 1500)}\n\nASSISTANT:\n${(assistant_reply || "").slice(0, 2000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "store_memory",
            description: "Store extracted facts and KG triples",
            parameters: {
              type: "object",
              properties: {
                facts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      fact: { type: "string" },
                      importance: { type: "integer", minimum: 1, maximum: 5 },
                    },
                    required: ["fact", "importance"],
                  },
                },
                triples: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      entity: { type: "string" },
                      entity_type: { type: "string" },
                      relation: { type: "string" },
                      target_entity: { type: "string" },
                      confidence: { type: "number", minimum: 0, maximum: 1 },
                    },
                    required: ["entity", "relation", "target_entity"],
                  },
                },
              },
              required: ["facts", "triples"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "store_memory" } },
        stream: false,
      }),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await res.json();
    const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : { facts: [], triples: [] };
    const facts = Array.isArray(args.facts) ? args.facts : [];
    const triples = Array.isArray(args.triples) ? args.triples : [];

    let savedFacts = 0;
    let savedTriples = 0;

    // Save facts → user_memories (vector context) AND user_memory_entries (UI display)
    if (facts.length > 0) {
      const sliced = facts.slice(0, 5);
      const memRows = sliced.map((f: any) => ({
        user_id: userId,
        fact: String(f.fact).slice(0, 1000),
        importance: Math.max(1, Math.min(5, Number(f.importance) || 2)),
        source: "auto_extract",
      }));
      const { error: memErr } = await sb.from("user_memories").insert(memRows);
      if (!memErr) savedFacts = memRows.length;

      // Mirror to user_memory_entries so the Memory page lists them
      const entryRows = sliced.map((f: any) => {
        const fact = String(f.fact).slice(0, 1000);
        const title = fact.split(/[.،,!?]/)[0].slice(0, 80);
        return {
          user_id: userId,
          scope: "account" as const,
          title,
          summary: fact,
          source_conversation_id: conversation_id || null,
          relevance_score: (Math.max(1, Math.min(5, Number(f.importance) || 2))) / 5,
          metadata: { source: "auto_extract", message_id: message_id || null },
        };
      });
      await sb.from("user_memory_entries").insert(entryRows);
    }

    // Save KG triples (dedupe via unique constraint)
    if (triples.length > 0) {
      const rows = triples.slice(0, 8).map((t: any) => ({
        user_id: userId,
        entity: String(t.entity).slice(0, 200),
        entity_type: t.entity_type ? String(t.entity_type).slice(0, 80) : null,
        relation: String(t.relation).slice(0, 80),
        target_entity: String(t.target_entity).slice(0, 200),
        confidence: typeof t.confidence === "number" ? t.confidence : 0.7,
        source_message_id: message_id || null,
      }));
      const { error } = await sb.from("user_knowledge_graph")
        .upsert(rows, { onConflict: "user_id,entity,relation,target_entity", ignoreDuplicates: true });
      if (!error) savedTriples = rows.length;
    }

    return new Response(JSON.stringify({ ok: true, savedFacts, savedTriples }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-memory error:", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
