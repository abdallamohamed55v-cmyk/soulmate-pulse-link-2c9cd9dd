// Polar checkout session creator
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const POLAR_API = "https://api.polar.sh/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const POLAR_TOKEN = Deno.env.get("POLAR_ACCESS_TOKEN");
    if (!POLAR_TOKEN) {
      console.error("POLAR_ACCESS_TOKEN not configured");
      return json({ error: "Payment service is not configured. Please contact support." }, 200);
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Please sign in to continue." }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate token — getUser() works with both legacy and signing-keys JWTs
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      console.warn("Auth failed:", userErr?.message);
      return json({ error: "Your session expired. Please sign in again." }, 401);
    }
    const user = userData.user;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid request body" }, 400);
    }

    const { product_id, plan = "starter", success_url } = body;
    if (!product_id || typeof product_id !== "string") {
      return json({ error: "product_id is required" }, 400);
    }

    const origin = req.headers.get("origin") || "https://megsyai.com";
    const successUrl = success_url || `${origin}/billing/success?checkout_id={CHECKOUT_ID}`;

    let polarRes: Response;
    try {
      polarRes = await fetch(`${POLAR_API}/checkouts/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${POLAR_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          products: [product_id],
          success_url: successUrl,
          external_customer_id: user.id,
          customer_email: user.email,
          metadata: { user_id: user.id, plan },
        }),
      });
    } catch (netErr: any) {
      console.error("Polar network error:", netErr?.message);
      return json({ error: "Could not reach payment provider. Please try again in a moment." }, 200);
    }

    if (!polarRes.ok) {
      const errText = await polarRes.text().catch(() => "");
      console.error("Polar checkout error:", polarRes.status, errText);
      // Return 200 with structured error so the SDK doesn't surface a generic 5xx
      return json(
        { error: "Failed to create checkout. Please try again or contact support." },
        200
      );
    }

    const checkout = await polarRes.json();
    if (!checkout?.url) {
      return json({ error: "Invalid checkout response. Please try again." }, 200);
    }
    return json({ url: checkout.url, id: checkout.id });
  } catch (e: any) {
    console.error("polar-checkout error:", e?.message, e?.stack);
    return json({ error: "Something went wrong. Please try again." }, 200);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
