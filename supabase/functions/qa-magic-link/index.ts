// TEMPORARY QA helper — sets a password for the QA user. Delete after smoke test.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const QA_EMAIL = "qa_smoke_1778403412@wshu.net";
const QA_USER_ID = "19e72636-65b6-4995-bd03-abca494ca8f3";
const QA_SECRET = "qa-smoke-2026-05-10";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== QA_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await supa.auth.admin.updateUserById(QA_USER_ID, {
    password: "QaSmoke!2026",
    email_confirm: true,
  });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true, email: QA_EMAIL }), {
    headers: { "Content-Type": "application/json" },
  });
});
