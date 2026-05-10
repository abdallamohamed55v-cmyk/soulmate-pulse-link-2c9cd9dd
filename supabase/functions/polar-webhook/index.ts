// Polar webhook handler — receives subscription/checkout/order events
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("POLAR_WEBHOOK_SECRET");
  if (!secret) return new Response("Webhook secret not configured", { status: 500 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));

  let payload: any;
  try {
    // Polar provides plain secret; Standard Webhooks expects base64
    const base64Secret = btoa(secret);
    const wh = new Webhook(base64Secret);
    payload = wh.verify(rawBody, headers);
  } catch (e: any) {
    console.error("Webhook signature verification failed:", e.message);
    return new Response("Invalid signature", { status: 401 });
  }

  const eventType = payload.type as string;
  const data = payload.data ?? {};
  const userId =
    data.metadata?.user_id ||
    data.customer?.external_id ||
    data.subscription?.customer?.external_id ||
    data.subscription?.metadata?.user_id ||
    null;

  // Map product_id -> { plan, credits, interval }
  const PRODUCT_MAP: Record<string, { plan: string; credits: number }> = {
    // Starter
    "c3483e63-7dbd-4214-bec2-894926f5590a": { plan: "starter",  credits: 80 },
    "729d9b3d-1acc-4d58-8a39-49ab63330674": { plan: "starter",  credits: 880 },
    // Pro
    "8da537b0-7192-46cd-b38a-bbe341febdf7": { plan: "pro",      credits: 280 },
    "bcbd0c61-a5bd-4934-872a-7413324a330c": { plan: "pro",      credits: 2480 },
    // Elite
    "d212d1e6-4958-4329-a1f4-5b460886fc9d": { plan: "elite",    credits: 480 },
    "0b8f0aa3-57a7-4dd5-9ab3-ce68cebec7f6": { plan: "elite",    credits: 4980 },
    // Business
    "1fb17ce3-5bb4-473e-8c67-e50a8ce927dd": { plan: "business", credits: 1480 },
    "39752b51-d4cd-4a03-9718-bb2b95f71084": { plan: "business", credits: 12980 },
  };

  const extractProductId = (d: any): string | null =>
    d.product_id ||
    d.product?.id ||
    d.products?.[0]?.id ||
    d.subscription?.product_id ||
    d.subscription?.product?.id ||
    d.items?.[0]?.product_id ||
    d.items?.[0]?.product?.id ||
    null;

  // Log event
  await supabase.from("payment_events").insert({
    user_id: userId,
    event_type: eventType,
    polar_event_id: data.id || null,
    payload: payload,
  });

  try {
    switch (eventType) {
      case "checkout.updated":
      case "checkout.created":
        if (data.status === "succeeded" && userId) {
          await activateSubscription(supabase, userId, data, "starter");
        }
        break;

      case "subscription.created":
      case "subscription.active":
      case "subscription.updated":
        if (userId) {
          await upsertSubscription(supabase, userId, data, "active");
        }
        break;

      case "subscription.canceled":
      case "subscription.revoked":
        if (userId) {
          await upsertSubscription(supabase, userId, data, "canceled");
          // Downgrade plan
          await supabase
            .from("profiles")
            .update({ plan: "free" })
            .eq("id", userId);
        }
        break;

      case "order.paid":
      case "order.created": {
        if (!userId) break;

        const productId = extractProductId(data);
        const mapping = productId ? PRODUCT_MAP[productId] : null;
        const orderId = data.id || data.order_id;

        if (!orderId) {
          console.warn("order event missing id; skipping to avoid unsafe credit");
          break;
        }

        if (!mapping) {
          console.warn("order.paid: no PRODUCT_MAP entry for product_id:", productId);
          await supabase.from("payment_events").insert({
            user_id: userId,
            event_type: "order.paid.unmapped",
            polar_event_id: orderId,
            payload: { product_id: productId, amount: data.amount, currency: data.currency },
          });
          break;
        }

        // Atomic, idempotent: unique constraint on polar_order_id guarantees once-only crediting
        const { data: result, error: rpcErr } = await supabase.rpc("process_polar_order", {
          p_order_id: orderId,
          p_user_id: userId,
          p_product_id: productId,
          p_plan: mapping.plan,
          p_credits: mapping.credits,
        });

        if (rpcErr) {
          console.error("process_polar_order failed:", rpcErr);
        } else if ((result as any)?.duplicate) {
          console.log("Duplicate order ignored:", orderId);
        } else {
          console.log("Credited order:", orderId, "→", mapping.credits, "MC");
        }
        break;
      }
    }
  } catch (e: any) {
    console.error("Webhook processing error:", e);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function activateSubscription(supabase: any, userId: string, data: any, plan: string) {
  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      polar_customer_id: data.customer_id || data.customer?.id || null,
      polar_subscription_id: data.subscription_id || data.id,
      polar_product_id: data.product_id || data.products?.[0]?.id || null,
      plan,
      status: "active",
      amount_cents: data.amount || null,
      currency: data.currency || "usd",
    },
    { onConflict: "polar_subscription_id" }
  );
  await supabase.from("profiles").update({ plan }).eq("id", userId);
}

async function upsertSubscription(supabase: any, userId: string, data: any, status: string) {
  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      polar_customer_id: data.customer_id || data.customer?.id || null,
      polar_subscription_id: data.id,
      polar_product_id: data.product_id || data.product?.id || null,
      plan: data.metadata?.plan || "starter",
      status,
      current_period_end: data.current_period_end || null,
      amount_cents: data.amount || data.recurring_interval_amount || null,
      currency: data.currency || "usd",
    },
    { onConflict: "polar_subscription_id" }
  );
  if (status === "active") {
    await supabase
      .from("profiles")
      .update({ plan: data.metadata?.plan || "starter" })
      .eq("id", userId);
  }
}
