import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateOTP(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(100000 + (arr[0] % 900000));
}

function otpEmailHtml(code: string): string {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:40px 30px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:28px">Verification Code</h1>
      </div>
      <div style="padding:30px;text-align:center">
        <p style="font-size:15px;line-height:1.8;color:#ccc">Use the following code to verify your identity:</p>
        <div style="margin:30px auto;background:#1a1a2e;border-radius:12px;padding:20px;max-width:280px">
          <p style="font-size:36px;font-weight:bold;letter-spacing:8px;margin:0;color:#fff">${code}</p>
        </div>
        <p style="font-size:13px;color:#888">This code expires in 10 minutes. Do not share it with anyone.</p>
        <p style="font-size:12px;color:#555;margin-top:24px">Megsy AI — Your AI Assistant</p>
      </div>
    </div>`;
}

async function sendEmail(email: string, otp: string) {
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = Number(Deno.env.get("SMTP_PORT") || "587");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || smtpUser;
  const fromName = Deno.env.get("SMTP_FROM_NAME") || "Megsy AI";

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("SMTP credentials not configured");
  }

  const client = new SMTPClient({
    connection: {
      hostname: smtpHost,
      port: smtpPort,
      tls: smtpPort === 465,
      auth: { username: smtpUser, password: smtpPass },
    },
  });

  await client.send({
    from: `${fromName} <${fromEmail}>`,
    to: email,
    subject: `${otp} — Your Megsy AI verification code`,
    html: otpEmailHtml(otp),
  });

  await client.close();
}

async function verifyOtp(supabase: any, email: string, code: string) {
  const { data: otpRecord } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("code", code)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!otpRecord) return null;

  await supabase.from("otp_codes").update({ used: true }).eq("id", otpRecord.id);
  return otpRecord;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, email, code } = await req.json();
    if (!email) throw new Error("Email is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "send") {
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabase.from("otp_codes").update({ used: true }).eq("email", email.toLowerCase()).eq("used", false);
      await supabase.from("otp_codes").insert({ email: email.toLowerCase(), code: otp, expires_at: expiresAt });
      await sendEmail(email, otp);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify-only" || action === "verify-2fa" || action === "verify-reset") {
      if (!code) throw new Error("Code is required");
      // verify-reset: check validity WITHOUT consuming, so update-password can re-verify+consume
      // (prevents anyone from calling update-password directly without holding the OTP).
      if (action === "verify-reset") {
        const { data: existing } = await supabase
          .from("otp_codes")
          .select("id")
          .eq("email", email.toLowerCase())
          .eq("code", code)
          .eq("used", false)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (!existing) {
          return new Response(JSON.stringify({ success: false, error: "Invalid or expired code" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const record = await verifyOtp(supabase, email, code);
      if (!record) {
        return new Response(JSON.stringify({ success: false, error: "Invalid or expired code" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (!code) throw new Error("Code is required");
      const record = await verifyOtp(supabase, email, code);
      if (!record) {
        return new Response(JSON.stringify({ success: false, error: "Invalid or expired code" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existingUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);

      if (existingUser) {
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: "magiclink", email: normalizedEmail,
        });
        if (linkError) throw new Error(linkError.message);
        return new Response(JSON.stringify({
          success: true, is_new: false, token_hash: linkData.properties.hashed_token,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        const randomPass = crypto.randomUUID() + "Aa1!";
        await supabase.auth.admin.createUser({
          email: normalizedEmail, password: randomPass, email_confirm: true,
        });
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: "magiclink", email: normalizedEmail,
        });
        if (linkError) throw new Error(linkError.message);
        return new Response(JSON.stringify({
          success: true, is_new: true, token_hash: linkData.properties.hashed_token,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    throw new Error("Invalid action");
  } catch (e) {
    console.error("otp error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
