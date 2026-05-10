// Generates a short, friendly chat summary describing what was just created.
// Used by FilesPage to replace the static "Created ..." line with an AI line
// in the user's own language that reflects the actual output.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const kind        = (body?.kind || "document").toString();
    const title       = (body?.title || "").toString().slice(0, 200);
    const prompt      = (body?.prompt || "").toString().slice(0, 1000);
    const templateName= (body?.templateName || "").toString().slice(0, 80);
    const slideCount  = Number(body?.slideCount) || 0;
    const wordCount   = Number(body?.wordCount) || 0;

    const sys = [
      "You are an assistant inside a creation tool, writing the chat reply that confirms what was just generated.",
      "Write ONE short sentence (max ~18 words). No emojis. No quotes. No markdown.",
      "Detect the user's prompt language and reply in the SAME language (Arabic stays Arabic).",
      "Be specific: mention what was made, and one concrete detail (template, slide count, or angle from the prompt).",
      "Sound natural and friendly, never robotic. Never start with 'I have' or 'تم' robotically — vary the opening.",
    ].join(" ");

    const facts = [
      `Type: ${kind}`,
      title ? `Title: ${title}` : "",
      templateName ? `Template: ${templateName}` : "",
      slideCount ? `Slides: ${slideCount}` : "",
      wordCount ? `Approx words: ${wordCount}` : "",
      prompt ? `User prompt: ${prompt}` : "",
    ].filter(Boolean).join("\n");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: sys },
          { role: "user",   content: facts },
        ],
        temperature: 0.7,
        max_tokens: 80,
      }),
    });

    if (!r.ok) {
      const fallback = title ? `Created "${title}"` : `Your ${kind} is ready.`;
      return new Response(JSON.stringify({ summary: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    let summary: string = (j?.choices?.[0]?.message?.content || "").trim();
    summary = summary.replace(/^["'`]|["'`]$/g, "").replace(/\s+/g, " ").slice(0, 240);
    if (!summary) summary = title ? `Created "${title}"` : `Your ${kind} is ready.`;

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ summary: "Done." , error: e?.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
