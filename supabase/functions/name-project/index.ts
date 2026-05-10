// Generate a 2-word project name from a free-form prompt using Lovable AI Gateway.
// Returns: { name: "Two Words" }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sanitize = (raw: string): string => {
  const cleaned = raw
    .replace(/[`*_~"#\[\]\(\)\{\}<>]/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/[.!?,;:]+$/g, "")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 2);
  const out = words.join(" ").slice(0, 30);
  return out || "New Project";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json().catch(() => ({}));
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ name: "New Project" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ name: sanitize(prompt) }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite-preview-09-2025",
        messages: [
          {
            role: "system",
            content:
              "Return ONLY a project name made of EXACTLY two words about the user's idea. " +
              "No quotes, no punctuation, no explanation. Title Case. Match the user's language.",
          },
          { role: "user", content: prompt.slice(0, 500) },
        ],
        temperature: 0.5,
        max_tokens: 16,
      }),
    });

    if (!r.ok) {
      return new Response(JSON.stringify({ name: sanitize(prompt) }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json().catch(() => ({} as any));
    const raw = data?.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ name: sanitize(String(raw)) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ name: "New Project" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
