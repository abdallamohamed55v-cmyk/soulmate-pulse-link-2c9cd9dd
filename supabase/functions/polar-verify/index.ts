// Verify a Polar checkout session after redirect
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const POLAR_TOKEN = Deno.env.get("POLAR_ACCESS_TOKEN");
    if (!POLAR_TOKEN) throw new Error("POLAR_ACCESS_TOKEN missing");

    const url = new URL(req.url);
    const checkoutId = url.searchParams.get("checkout_id");
    if (!checkoutId) return json({ error: "checkout_id required" }, 400);

    const res = await fetch(`https://api.polar.sh/v1/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${POLAR_TOKEN}` },
    });
    if (!res.ok) {
      const t = await res.text();
      return json({ error: "Polar lookup failed", details: t }, 502);
    }
    const checkout = await res.json();
    return json({
      status: checkout.status,
      amount: checkout.amount,
      currency: checkout.currency,
      product_name: checkout.product?.name,
    });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
