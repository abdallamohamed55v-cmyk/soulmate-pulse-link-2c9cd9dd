import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  alt: string;
  src: { original: string; large2x: string; large: string; medium: string; portrait: string; landscape: string; tiny: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, perPage = 6, orientation = "landscape" } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("PEXELS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: "Image service not configured", photos: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const safePerPage = Math.max(1, Math.min(15, Number(perPage) || 6));
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query.slice(0, 200));
    url.searchParams.set("per_page", String(safePerPage));
    if (orientation === "portrait" || orientation === "landscape" || orientation === "square") {
      url.searchParams.set("orientation", orientation);
    }

    const resp = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
    });

    if (!resp.ok) {
      console.error("pexels error:", resp.status);
      return new Response(JSON.stringify({ success: false, error: "Image search failed", photos: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const photos: PexelsPhoto[] = data?.photos ?? [];

    const simplified = photos.map((p) => ({
      id: p.id,
      url: p.src.large2x || p.src.large || p.src.original,
      thumb: p.src.medium || p.src.tiny,
      width: p.width,
      height: p.height,
      photographer: p.photographer,
      alt: p.alt || query,
      source_url: p.url,
    }));

    return new Response(JSON.stringify({ success: true, photos: simplified, total: data?.total_results ?? simplified.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("pexels-search error:", e);
    return new Response(JSON.stringify({ success: false, error: "Image search failed", photos: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
