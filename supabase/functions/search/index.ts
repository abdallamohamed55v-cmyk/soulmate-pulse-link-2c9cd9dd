import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, type = "web", limit = 8 } = await req.json();
    const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
    if (!SERPER_API_KEY) throw new Error("SERPER_API_KEY not configured");

    // ── SHOPPING SEARCH ──
    if (type === "shopping") {
      const resp = await fetch("https://google.serper.dev/shopping", {
        method: "POST",
        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: limit }),
      });
      const data = await resp.json();
      const products = (data.shopping || []).slice(0, limit).map((p: any) => ({
        title: p.title,
        price: p.price || "—",
        image: p.imageUrl,
        link: p.link,
        seller: p.source,
        rating: p.rating ? `${p.rating}` : null,
        delivery: p.delivery || null,
      }));
      return new Response(JSON.stringify({ products }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── WEB + IMAGE SEARCH (default) ──
    const [searchResp, imageResp] = await Promise.all([
      fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: 8 }),
      }),
      fetch("https://google.serper.dev/images", {
        method: "POST",
        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: 6 }),
      }),
    ]);

    const data = await searchResp.json();
    const imageData = await imageResp.json();

    let context = "";
    const images: string[] = [];

    if (data.organic) {
      context = data.organic.map((r: any, i: number) =>
        `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.link}`
      ).join("\n\n");
    }

    if (imageData.images) {
      imageData.images.slice(0, 4).forEach((img: any) => {
        if (img.imageUrl) images.push(img.imageUrl);
      });
    }

    if (data.images && images.length < 2) {
      data.images.forEach((img: any) => {
        if (img.imageUrl && !images.includes(img.imageUrl) && images.length < 4) {
          images.push(img.imageUrl);
        }
      });
    }

    if (data.knowledgeGraph) {
      const kg = data.knowledgeGraph;
      context = `${kg.title || ""}\n${kg.description || ""}\n\n${context}`;
      if (kg.imageUrl && !images.includes(kg.imageUrl)) images.unshift(kg.imageUrl);
    }

    return new Response(JSON.stringify({ context, images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Search error:", e);
    return new Response(JSON.stringify({ context: "", images: [], products: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
