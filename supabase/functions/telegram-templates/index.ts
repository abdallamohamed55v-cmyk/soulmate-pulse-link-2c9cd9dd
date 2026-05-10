// Telegram bot webhook for uploading template preview images.
// Send a photo to the bot with caption = template id (e.g. "megsy-3d-portfolio").
// Optional prefix "set <id>" is also accepted.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

const TG_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "slide-images";

async function tgApi(method: string, body: any) {
  const r = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function downloadTgFile(fileId: string): Promise<Uint8Array | null> {
  const meta = await (await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/getFile?file_id=${fileId}`)).json();
  const path = meta?.result?.file_path;
  if (!path) return null;
  const r = await fetch(`https://api.telegram.org/file/bot${TG_BOT_TOKEN}/${path}`);
  if (!r.ok) return null;
  return new Uint8Array(await r.arrayBuffer());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const update = await req.json();
    const msg = update?.message ?? update?.edited_message;
    const chatId = msg?.chat?.id;
    if (!chatId) return new Response("ok");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const text = (msg?.text || "").trim();
    if (text === "/start" || text === "/help") {
      await tgApi("sendMessage", {
        chat_id: chatId,
        text:
          "أرسل صورة وضع في caption معرف القالب.\n" +
          "أمثلة:\n• megsy-3d-portfolio  (Slides)\n• cv-modern-tech     (Resume)\n• rep-corporate      (Report)\n\n" +
          "الأوامر:\n/list — عرض كل القوالب المخزنة\n/docs — قوالب المستندات المتاحة",
      });
      return new Response("ok");
    }

    if (text === "/list") {
      const [{ data: slides }, { data: docs }] = await Promise.all([
        admin.from("template_images").select("template_id").order("template_id"),
        admin.from("document_template_images").select("template_id").order("template_id"),
      ]);
      const sLines = (slides || []).map((r: any) => `• ${r.template_id}`).join("\n") || "—";
      const dLines = (docs   || []).map((r: any) => `• ${r.template_id}`).join("\n") || "—";
      await tgApi("sendMessage", { chat_id: chatId, text: `Slides:\n${sLines}\n\nDocuments:\n${dLines}` });
      return new Response("ok");
    }

    if (text === "/docs") {
      const { data } = await admin.from("document_templates").select("id, kind, name").order("kind").order("sort_order");
      const lines = (data || []).map((r: any) => `• ${r.id}  (${r.kind}) — ${r.name}`).join("\n") || "لا يوجد.";
      await tgApi("sendMessage", { chat_id: chatId, text: lines });
      return new Response("ok");
    }

    const photos = msg?.photo;
    if (!Array.isArray(photos) || photos.length === 0) {
      await tgApi("sendMessage", { chat_id: chatId, text: "أرسل صورة + caption = template id" });
      return new Response("ok");
    }

    const caption = (msg?.caption || "").trim();
    const id = caption.replace(/^set\s+/i, "").trim();
    if (!id) {
      await tgApi("sendMessage", { chat_id: chatId, text: "ضع template id في caption" });
      return new Response("ok");
    }

    const largest = photos[photos.length - 1];
    const bytes = await downloadTgFile(largest.file_id);
    if (!bytes) {
      await tgApi("sendMessage", { chat_id: chatId, text: "فشل تنزيل الصورة" });
      return new Response("ok");
    }

    const path = `template-thumbs/${id}.jpg`;
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (upErr) {
      await tgApi("sendMessage", { chat_id: chatId, text: `خطأ رفع: ${upErr.message}` });
      return new Response("ok");
    }
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;

    // Auto-route: if id matches a document_templates row, save there; otherwise treat as slides template.
    const { data: docTpl } = await admin.from("document_templates").select("id").eq("id", id).maybeSingle();
    if (docTpl) {
      await admin.from("document_template_images").upsert({
        template_id: id,
        image_url: url,
        source: "telegram",
        uploaded_by_chat_id: chatId,
        updated_at: new Date().toISOString(),
      });
      await tgApi("sendMessage", { chat_id: chatId, text: `✅ تم حفظ صورة Document: ${id}` });
    } else {
      await admin.from("template_images").upsert({
        template_id: id,
        image_url: url,
        source: "telegram",
        uploaded_by_chat_id: chatId,
        updated_at: new Date().toISOString(),
      });
      await tgApi("sendMessage", { chat_id: chatId, text: `✅ تم حفظ صورة Slides: ${id}` });
    }
    return new Response("ok");
  } catch (e) {
    console.error("telegram-templates error", e);
    return new Response("ok"); // always 200 so Telegram doesn't retry forever
  }
});
