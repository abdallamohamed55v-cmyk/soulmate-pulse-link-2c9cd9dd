import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, type = "image" } = await req.json();
    if (!prompt) throw new Error("No prompt provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = type === "video"
      ? "You are a video prompt enhancer. Take the user's simple prompt and enhance it into a detailed, cinematic video generation prompt. Add camera movements, lighting, atmosphere, style details. Keep it under 200 words. Return ONLY the enhanced prompt, nothing else."
      : "You are an image prompt enhancer. Take the user's simple prompt and enhance it into a detailed, high-quality image generation prompt. Add style, lighting, composition, color palette details. Keep it under 150 words. Return ONLY the enhanced prompt, nothing else.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      throw new Error(`AI error: ${response.status} ${t}`);
    }

    const data = await response.json();
    const enhanced = data.choices?.[0]?.message?.content?.trim() || prompt;

    return new Response(JSON.stringify({ enhanced }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
