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
    if (!apiKey) return new Response(JSON.stringify({ questions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Auth
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    let userId: string | null = null;
    if (token) {
      try {
        const { data } = await sb.auth.getUser(token);
        userId = data?.user?.id || null;
      } catch { /* ignore */ }
    }

    const sysPrompt = `You suggest 3 SHORT follow-up questions a user might ask next, based on the conversation. Match the language and dialect of the user's message exactly. Be specific to the topic, not generic. Each question must be under 10 words.`;

    const res = await fetch(LOVABLE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: `User asked:\n${(user_message || "").slice(0, 600)}\n\nAssistant replied:\n${(assistant_reply || "").slice(0, 1500)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_followups",
            description: "Return 3 short follow-up questions",
            parameters: {
              type: "object",
              properties: {
                questions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
              },
              required: ["questions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_followups" } },
        stream: false,
      }),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ questions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await res.json();
    const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : { questions: [] };
    const questions: string[] = (args.questions || []).slice(0, 3);

    // Persist (best-effort)
    if (userId && questions.length > 0) {
      sb.from("chat_followups").insert({
        message_id: message_id || null,
        conversation_id: conversation_id || null,
        user_id: userId,
        questions,
      }).then(() => {}).catch(() => {});
    }

    return new Response(JSON.stringify({ questions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("followups error:", e);
    return new Response(JSON.stringify({ questions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
