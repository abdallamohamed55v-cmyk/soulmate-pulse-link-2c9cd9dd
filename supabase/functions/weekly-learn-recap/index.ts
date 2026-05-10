// Weekly Learn Mode recap email — runs every Friday via pg_cron.
// Aggregates learn_sessions from the last 7 days per user and sends a
// recap email through the existing send-email function.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SessionRow {
  user_id: string;
  topic: string | null;
  duration_min: number | null;
  questions_total: number | null;
  questions_correct: number | null;
  weak_topics: any;
  mastered_topics: any;
}

const buildHtml = (name: string, totalMin: number, sessions: number, correct: number, total: number, weak: string[], mastered: string[]) => {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#10b981,#059669);padding:36px 30px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:26px">📚 ملخص أسبوعك في التعلم</h1>
      <p style="color:#d1fae5;margin:8px 0 0;font-size:14px">جمعة سعيدة يا ${name}!</p>
    </div>
    <div style="padding:30px">
      <p style="font-size:15px;line-height:1.8">إليك ملخص جلسات التعلم على Megsy خلال آخر 7 أيام:</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0">
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#10b981">${totalMin}</div>
          <div style="font-size:12px;color:#888">دقيقة مذاكرة</div>
        </div>
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#3b82f6">${sessions}</div>
          <div style="font-size:12px;color:#888">جلسة</div>
        </div>
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#a855f7">${total}</div>
          <div style="font-size:12px;color:#888">سؤال حليته</div>
        </div>
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#f59e0b">${accuracy}%</div>
          <div style="font-size:12px;color:#888">دقة الإجابات</div>
        </div>
      </div>
      ${mastered.length ? `<h3 style="color:#10b981;font-size:15px;margin:18px 0 8px">✅ أتقنت:</h3><ul style="font-size:14px;line-height:1.8;color:#d1fae5;padding-inline-start:18px">${mastered.slice(0, 6).map(t => `<li>${t}</li>`).join("")}</ul>` : ""}
      ${weak.length ? `<h3 style="color:#f59e0b;font-size:15px;margin:18px 0 8px">📌 محتاج مراجعة:</h3><ul style="font-size:14px;line-height:1.8;color:#fef3c7;padding-inline-start:18px">${weak.slice(0, 6).map(t => `<li>${t}</li>`).join("")}</ul>` : ""}
      <div style="text-align:center;margin:30px 0 10px">
        <a href="https://smart-hub-egy.lovable.app/chat" style="background:#10b981;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">ابدأ جلسة جديدة</a>
      </div>
      <p style="font-size:12px;color:#666;text-align:center;margin-top:24px">Megsy AI — رفيق التعلم</p>
    </div>
  </div>`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: sessions, error } = await supabase
      .from("learn_sessions")
      .select("user_id, topic, duration_min, questions_total, questions_correct, weak_topics, mastered_topics")
      .gte("created_at", since);

    if (error) throw error;

    // Group by user_id
    const byUser = new Map<string, SessionRow[]>();
    for (const s of (sessions || []) as SessionRow[]) {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
      byUser.get(s.user_id)!.push(s);
    }

    let sent = 0;
    for (const [userId, rows] of byUser.entries()) {
      const totalMin = rows.reduce((a, r) => a + (r.duration_min || 0), 0);
      if (totalMin <= 0) continue;
      const total = rows.reduce((a, r) => a + (r.questions_total || 0), 0);
      const correct = rows.reduce((a, r) => a + (r.questions_correct || 0), 0);
      const weak = Array.from(new Set(rows.flatMap(r => Array.isArray(r.weak_topics) ? r.weak_topics : []))) as string[];
      const mastered = Array.from(new Set(rows.flatMap(r => Array.isArray(r.mastered_topics) ? r.mastered_topics : []))) as string[];

      // Get email + name
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (!email) continue;
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
      const name = prof?.display_name || email.split("@")[0];

      // Respect notification preferences
      const { data: pref } = await supabase.from("notification_preferences").select("email_newsletter").eq("user_id", userId).maybeSingle();
      if (pref && pref.email_newsletter === false) continue;

      const html = buildHtml(name, totalMin, rows.length, correct, total, weak, mastered);

      const resp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          "x-internal-secret": Deno.env.get("INTERNAL_FUNCTION_SECRET") || "",
        },
        body: JSON.stringify({
          to: email,
          subject: `📚 ملخص أسبوعك على Megsy — ${totalMin} دقيقة مذاكرة`,
          html,
          user_id: userId,
          type: "system",
        }),
      });
      if (resp.ok) sent++;
      else console.warn("send-email failed for", userId, await resp.text());
    }

    return new Response(JSON.stringify({ success: true, recipients: sent, users_with_activity: byUser.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-learn-recap error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
