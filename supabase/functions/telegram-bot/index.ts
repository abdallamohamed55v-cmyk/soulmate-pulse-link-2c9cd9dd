import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// All models are now dynamic via models_added in memories table
// Only chat & code models remain hardcoded
const IMAGE_MODELS: string[] = [];
const VIDEO_MODELS: string[] = [];

const CHAT_MODELS = [
  "google/gemini-3-flash-preview", "google/gemini-2.5-pro",
  "openai/gpt-5", "x-ai/grok-3",
];

const CODE_MODELS = ["x-ai/grok-3", "openai/gpt-5"];

const MODEL_NAMES: Record<string, string> = {
  "google/gemini-3-flash-preview": "Megsy V1", "google/gemini-2.5-pro": "Gemini 2.5 Pro",
  "openai/gpt-5": "GPT-5", "x-ai/grok-3": "Grok 3",
};

// Dynamic categories - images & videos pull from models_added
function buildCategories(addedModels: Record<string, unknown>[]) {
  const imgModels = addedModels.filter((m: any) => m.type === "image" || m.type === "image-tool").map((m: any) => m.id);
  const vidModels = addedModels.filter((m: any) => ["video", "video-i2v", "video-avatar", "video-effect", "video-motion"].includes(m.type)).map((m: any) => m.id);
  // Update MODEL_NAMES from added models
  addedModels.forEach((m: any) => { if (m.name) MODEL_NAMES[m.id] = m.name; });
  return [
    { key: "images", label: "نماذج الصور", emoji: "🖼", models: imgModels },
    { key: "videos", label: "نماذج الفيديو", emoji: "🎬", models: vidModels },
    { key: "chat", label: "نماذج المحادثة", emoji: "💬", models: CHAT_MODELS },
    { key: "code", label: "نماذج البرمجة", emoji: "💻", models: CODE_MODELS },
  ];
}

// Fallback static categories (used when no DB call needed)
const CATEGORIES = [
  { key: "images", label: "نماذج الصور", emoji: "🖼", models: IMAGE_MODELS },
  { key: "videos", label: "نماذج الفيديو", emoji: "🎬", models: VIDEO_MODELS },
  { key: "chat", label: "نماذج المحادثة", emoji: "💬", models: CHAT_MODELS },
  { key: "code", label: "نماذج البرمجة", emoji: "💻", models: CODE_MODELS },
];

const PER_PAGE = 6;
const USERS_PER_PAGE = 8;

const FIELDS = [
  { key: "name", label: "الاسم" },
  { key: "credits", label: "التكلفة (MC)" },
  { key: "description", label: "الوصف" },
  { key: "type", label: "النوع" },
  { key: "speed", label: "السرعة" },
  { key: "quality", label: "الجودة" },
  { key: "requiresImage", label: "يتطلب صورة" },
  { key: "maxImages", label: "أقصى عدد صور" },
  { key: "fal_id", label: "معرف fal.ai" },
  { key: "openrouter_id", label: "معرف OpenRouter" },
  { key: "provider", label: "المزود" },
  { key: "capabilities", label: "القدرات" },
];

const MC_PRESETS = [5, 10, 25, 50, 100, 500];

const SHOWCASE_ASPECTS = ["1:1", "2:3", "3:2", "4:3", "16:9", "9:16", "4:5"];
const SHOWCASE_QUALITIES = ["1K", "2K", "4K", "8K"];

// Capabilities for selection-based editing
const CAPABILITY_OPTIONS = [
  { key: "text-to-image", label: "نص → صورة" },
  { key: "image-to-image", label: "صورة → صورة" },
  { key: "multi-image", label: "عدة صور" },
  { key: "inpainting", label: "Inpainting" },
  { key: "outpainting", label: "Outpainting" },
  { key: "upscale", label: "تكبير" },
  { key: "remove-bg", label: "حذف الخلفية" },
  { key: "style-transfer", label: "نقل الأسلوب" },
  { key: "face-enhance", label: "تحسين الوجه" },
  { key: "colorize", label: "تلوين" },
  { key: "restore", label: "ترميم" },
  { key: "text-to-video", label: "نص → فيديو" },
  { key: "image-to-video", label: "صورة → فيديو" },
  { key: "avatar", label: "أفاتار" },
  { key: "lipsync", label: "Lipsync" },
  { key: "editing", label: "تعديل/Edit" },
  { key: "logo", label: "شعارات" },
  { key: "sticker", label: "ملصقات" },
  { key: "qr", label: "QR فني" },
  { key: "product-photo", label: "صور منتجات" },
];

// Customization features for per-model settings
const CUST_FEATURES = [
  { key: "ar", label: "نسبة العرض", emoji: "📐" },
  { key: "q", label: "الجودة", emoji: "🎯" },
  { key: "ni", label: "عدد الصور/الفيديوهات", emoji: "🔢" },
  { key: "neg", label: "Negative Prompt", emoji: "🚫" },
  { key: "dur", label: "المدة (فيديو)", emoji: "⏱" },
  { key: "res", label: "الدقة (فيديو)", emoji: "📺" },
];

// Available options for each customization feature
const CUST_OPTIONS: Record<string, string[]> = {
  ar: ["1:1", "2:3", "3:2", "4:3", "3:4", "16:9", "9:16", "4:5", "5:4"],
  q: ["512px", "1K", "2K", "4K"],
  ni: ["1", "2", "3", "4", "6", "8"],
  dur: ["3s", "4s", "5s", "6s", "8s", "10s"],
  res: ["480p", "720p", "1080p", "2K", "4K"],
};

// Price modifiers (MC)
const CUST_PRICES = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 8, 10, 15, 20];

// Badge options for model cards
const BADGE_OPTIONS = ["4K", "NEW", "PRO", "FREE", "FAST", "HD", "10s", "β", "🔥"];


const FAL_PREFIXES = [
  { label: "fal-ai/", value: "fal-ai/" },
  { label: "fal-ai/flux/", value: "fal-ai/flux/" },
  { label: "fal-ai/stable-diffusion/", value: "fal-ai/stable-diffusion/" },
  { label: "fal-ai/wan/", value: "fal-ai/wan/" },
  { label: "fal-ai/kling/", value: "fal-ai/kling/" },
];

interface BotSession {
  page?: "images" | "videos";
  modelIndex?: number;
  models?: string[];
  adminAction?: string;
  adminModelId?: string;
  adminField?: string;
  adminUserId?: string;
  oauthStep?: string;
  oauthAppName?: string;
  oauthAppId?: string;
  // Showcase session fields
  showcaseStep?: string;
  showcaseMediaUrl?: string;
  showcaseMediaType?: string;
  showcasePrompt?: string;
  showcaseModelId?: string;
  showcaseModelName?: string;
  showcaseAspect?: string;
  showcaseQuality?: string;
  showcaseDuration?: string;
  showcaseStyle?: string;
  showcaseItemId?: string;
  // Add model flow
  addModelStep?: string;
  addModelData?: Record<string, string>;
}

// ---- Helpers ----
async function loadSession(sb: any, chatId: number): Promise<BotSession | null> {
  const { data } = await sb.from("memories").select("value").eq("key", `tg_${chatId}`).maybeSingle();
  if (!data) return null;
  try { return JSON.parse(data.value); } catch { return null; }
}

async function saveSession(sb: any, chatId: number, session: BotSession) {
  await sb.from("memories").delete().eq("key", `tg_${chatId}`);
  await sb.from("memories").insert({ key: `tg_${chatId}`, value: JSON.stringify(session) });
}

async function clearSession(sb: any, chatId: number) {
  await sb.from("memories").delete().eq("key", `tg_${chatId}`);
}

async function tg(token: string, method: string, body: Record<string, unknown>) {
  const resp = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json();
}

async function send(token: string, chatId: number, msgId: number | undefined, text: string, keyboard: unknown[][], parse_mode = "Markdown") {
  if (msgId) {
    const res = await tg(token, "editMessageText", {
      chat_id: chatId, message_id: msgId, text, parse_mode,
      reply_markup: JSON.stringify({ inline_keyboard: keyboard }),
    });
    if (res.ok) return;
  }
  await tg(token, "sendMessage", {
    chat_id: chatId, text, parse_mode,
    reply_markup: JSON.stringify({ inline_keyboard: keyboard }),
  });
}

async function getExistingMedia(sb: any, models: string[]) {
  const { data } = await sb.from("model_media").select("model_id").in("model_id", models);
  return new Set((data || []).map((r: { model_id: string }) => r.model_id));
}

async function getModelConfig(sb: any, modelId: string): Promise<Record<string, string>> {
  const { data } = await sb.from("memories").select("value").eq("key", `model_config_${modelId}`).maybeSingle();
  if (!data) return {};
  try { return JSON.parse(data.value); } catch { return {}; }
}

async function setModelConfig(sb: any, modelId: string, config: Record<string, string>) {
  await sb.from("memories").delete().eq("key", `model_config_${modelId}`);
  await sb.from("memories").insert({ key: `model_config_${modelId}`, value: JSON.stringify(config) });
}

async function loadAddedModels(sb: any): Promise<Record<string, unknown>[]> {
  const { data } = await sb.from("memories").select("value").eq("key", "models_added").maybeSingle();
  if (!data) return [];
  try { return JSON.parse(data.value); } catch { return []; }
}

async function getDynamicCategories(sb: any) {
  const added = await loadAddedModels(sb);
  return buildCategories(added);
}

function modelListKB(models: string[], page: number, catKey: string, prefix: string) {
  const start = page * PER_PAGE;
  const slice = models.slice(start, start + PER_PAGE);
  const total = Math.ceil(models.length / PER_PAGE) || 1;
  const rows: { text: string; callback_data: string }[][] = [];

  for (let i = 0; i < slice.length; i += 2) {
    const row: { text: string; callback_data: string }[] = [];
    row.push({ text: MODEL_NAMES[slice[i]] || slice[i], callback_data: `${prefix}_${slice[i]}` });
    if (slice[i + 1]) row.push({ text: MODEL_NAMES[slice[i + 1]] || slice[i + 1], callback_data: `${prefix}_${slice[i + 1]}` });
    rows.push(row);
  }

  const nav: { text: string; callback_data: string }[] = [];
  if (page > 0) nav.push({ text: "◀️ السابق", callback_data: `nav_${prefix}_${catKey}_${page - 1}` });
  nav.push({ text: `${page + 1}/${total}`, callback_data: "noop" });
  if (page < total - 1) nav.push({ text: "التالي ▶️", callback_data: `nav_${prefix}_${catKey}_${page + 1}` });
  if (nav.length > 0) rows.push(nav);
  rows.push([{ text: "🔙 رجوع", callback_data: `back_${prefix}_cats` }]);
  return rows;
}

function dynamicCatsKB(cats: ReturnType<typeof buildCategories>, prefix: string) {
  return cats.map(c => [{
    text: `${c.emoji} ${c.label} (${c.models.length})`,
    callback_data: `cat_${prefix}_${c.key}`,
  }]);
}

function catsKB(prefix: string) {
  return CATEGORIES.map(c => [{
    text: `${c.emoji} ${c.label} (${c.models.length})`,
    callback_data: `cat_${prefix}_${c.key}`,
  }]);
}

// ---- OAuth Helpers ----
function generateId(len = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const b of arr) result += chars[b % chars.length];
  return result;
}

async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ---- Main Menu ----
function mainMenuKB() {
  return [
    [{ text: "📸 رفع الوسائط", callback_data: "upload_menu" }],
    [{ text: "✏️ تعديل النماذج", callback_data: "edit_menu" }],
    [{ text: "👥 إدارة المستخدمين", callback_data: "users_menu" }],
    [{ text: "🔑 OAuth Apps", callback_data: "oauth_menu" }],
    [{ text: "🎨 معرض العرض (Showcase)", callback_data: "showcase_menu" }],
    [{ text: "⚙️ إعدادات الصفحات", callback_data: "pagesettings_menu" }],
    [{ text: "♾️ Unlimited (LemonData)", callback_data: "lemon_menu" }],
    [{ text: "🔐 API Keys (AgentRouter/Serper/WaveSpeed/HB)", callback_data: "apikeys_menu" }],
    [{ text: "🖼 Landing Page Photos", callback_data: "tools_menu" }],
    [{ text: "📋 Tool Templates (قوالب)", callback_data: "tool_templates_menu" }],
    [{ text: "🎞️ Slide Templates", callback_data: "slide_templates_menu" }],
    [{ text: "📷 Headshot (قوالب)", callback_data: "headshot_menu" }],
    [{ text: "🎤 Voice Templates", callback_data: "voice_templates_menu" }],
    [{ text: "🔊 TTS Voices", callback_data: "tts_voices_menu" }],
    [{ text: "📊 الإحصائيات", callback_data: "stats" }],
  ];
}

// ---- Page Settings Defaults ----
const DEFAULT_PAGE_IMAGES = {
  styles: ["none", "dynamic", "cinematic", "creative", "fashion", "portrait", "stock-photo", "vibrant", "anime", "3d-render"],
  aspectRatios: ["2:3", "1:1", "16:9"],
  maxImages: 4,
  defaultStyle: "none",
  defaultAspect: "1:1",
  defaultNumImages: 1,
};

const DEFAULT_PAGE_VIDEOS = {
  aspectRatios: ["9:16", "16:9", "1:1", "4:3"],
  durations: [4, 5, 6, 8, 10],
  resolutions: ["720p", "1080p", "2K", "4K"],
  defaultAspect: "16:9",
  defaultDuration: 5,
  defaultResolution: "1080p",
};

async function getPageSettings(sb: any, page: "images" | "videos") {
  const defaults = page === "images" ? DEFAULT_PAGE_IMAGES : DEFAULT_PAGE_VIDEOS;
  const { data } = await sb.from("memories").select("value").eq("key", `page_settings_${page}`).maybeSingle();
  if (!data) return { ...defaults };
  try { return { ...defaults, ...JSON.parse(data.value) }; } catch { return { ...defaults }; }
}

async function savePageSettings(sb: any, page: "images" | "videos", settings: Record<string, unknown>) {
  await sb.from("memories").delete().eq("key", `page_settings_${page}`);
  await sb.from("memories").insert({ key: `page_settings_${page}`, value: JSON.stringify(settings) });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!BOT_TOKEN) return new Response("missing token", { status: 500 });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const update = await req.json();
    const message = update.message;
    const callback = update.callback_query;

    // ==================== CALLBACKS ====================
    if (callback) {
      const chatId = callback.message.chat.id;
      const msgId = callback.message.message_id;
      const d = callback.data;
      await tg(BOT_TOKEN, "answerCallbackQuery", { callback_query_id: callback.id });

      if (d === "noop") return new Response("OK");

      // ---- القائمة الرئيسية ----
      if (d === "main_menu") {
        await clearSession(sb, chatId);
        await send(BOT_TOKEN, chatId, msgId, "🤖 *لوحة تحكم Megsy*\n\nاختر عملية:", mainMenuKB());
        return new Response("OK");
      }

      // ==================== API Keys Management ====================
      if (d === "apikeys_menu") {
        const services = ["agentrouter", "serper", "wavespeed", "deepgram", "hyperbrowser", "magicslides"];
        const stats: string[] = [];
        for (const svc of services) {
          const { data: keys } = await sb.from("api_keys").select("id, is_active, is_blocked, usage_count").eq("service", svc);
          const total = keys?.length || 0;
          const active = keys?.filter((k: any) => k.is_active && !k.is_blocked).length || 0;
          const blocked = keys?.filter((k: any) => k.is_blocked).length || 0;
          stats.push(`*${svc}*: ${total} مفتاح (✅ ${active} | 🚫 ${blocked})`);
        }
        await send(BOT_TOKEN, chatId, msgId,
          `🔐 *إدارة مفاتيح API*\n\n${stats.join("\n")}`,
          [
            [{ text: "🤖 AgentRouter", callback_data: "ak_svc_agentrouter" }],
            [{ text: "🔍 Serper", callback_data: "ak_svc_serper" }],
            [{ text: "🌊 WaveSpeed", callback_data: "ak_svc_wavespeed" }],
            [{ text: "🎙️ Deepgram", callback_data: "ak_svc_deepgram" }],
            [{ text: "🌐 Hyperbrowser", callback_data: "ak_svc_hyperbrowser" }],
            [{ text: "📊 MagicSlides", callback_data: "ak_svc_magicslides" }],
            [{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }],
          ]
        );
        return new Response("OK");
      }

      if (d.startsWith("ak_svc_")) {
        const service = d.replace("ak_svc_", "");
        const { data: keys } = await sb.from("api_keys").select("id, api_key, is_active, is_blocked, usage_count, label").eq("service", service);
        const total = keys?.length || 0;
        const active = keys?.filter((k: any) => k.is_active && !k.is_blocked).length || 0;
        const svcNames: Record<string, string> = { agentrouter: "AgentRouter", serper: "Serper", wavespeed: "WaveSpeed", deepgram: "Deepgram", hyperbrowser: "Hyperbrowser", magicslides: "MagicSlides" };
        await send(BOT_TOKEN, chatId, msgId,
          `🔐 *${svcNames[service] || service}*\n\nإجمالي: *${total}* | نشط: *${active}*`,
          [
            [{ text: "➕ إضافة مفتاح", callback_data: `ak_add_${service}` }],
            [{ text: "📋 قائمة المفاتيح", callback_data: `ak_list_${service}_0` }],
            [{ text: "🔓 فك حظر الكل", callback_data: `ak_unblock_${service}` }],
            [{ text: "🔙 رجوع", callback_data: "apikeys_menu" }],
          ]
        );
        return new Response("OK");
      }

      if (d.startsWith("ak_add_")) {
        const service = d.replace("ak_add_", "");
        await saveSession(sb, chatId, { adminAction: `ak_awaiting_key_${service}` } as any);
        await send(BOT_TOKEN, chatId, msgId,
          `➕ *إضافة مفتاح ${service}*\n\nأرسل المفتاح الآن:\n(يمكنك إرسال عدة مفاتيح، كل مفتاح في سطر)`,
          [[{ text: "❌ إلغاء", callback_data: `ak_svc_${service}` }]]
        );
        return new Response("OK");
      }

      if (d.startsWith("ak_list_")) {
        const parts = d.replace("ak_list_", "").split("_");
        const service = parts[0];
        const page = parseInt(parts[1]) || 0;
        const PAGE_SIZE = 8;
        const { data: keys } = await sb.from("api_keys")
          .select("id, api_key, is_active, is_blocked, usage_count")
          .eq("service", service)
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        const { count } = await sb.from("api_keys").select("id", { count: "exact", head: true }).eq("service", service);
        const totalPages = Math.ceil((count || 0) / PAGE_SIZE) || 1;

        if (!keys || keys.length === 0) {
          await send(BOT_TOKEN, chatId, msgId, "لا توجد مفاتيح.", [[{ text: "➕ إضافة", callback_data: `ak_add_${service}` }, { text: "🔙 رجوع", callback_data: `ak_svc_${service}` }]]);
          return new Response("OK");
        }

        const rows: { text: string; callback_data: string }[][] = keys.map((k: any) => [{
          text: `${k.is_blocked ? "🚫" : "✅"} ...${k.api_key.slice(-6)} (${k.usage_count || 0})`,
          callback_data: `ak_key_${service}_${k.id}`,
        }]);

        const nav: { text: string; callback_data: string }[] = [];
        if (page > 0) nav.push({ text: "◀️", callback_data: `ak_list_${service}_${page - 1}` });
        nav.push({ text: `${page + 1}/${totalPages}`, callback_data: "noop" });
        if (page < totalPages - 1) nav.push({ text: "▶️", callback_data: `ak_list_${service}_${page + 1}` });
        rows.push(nav);
        rows.push([{ text: "🔙 رجوع", callback_data: `ak_svc_${service}` }]);

        await send(BOT_TOKEN, chatId, msgId, `📋 *مفاتيح ${service}*`, rows);
        return new Response("OK");
      }

      if (d.startsWith("ak_key_")) {
        const parts = d.replace("ak_key_", "").split("_");
        const service = parts[0];
        const keyId = parts[1];
        const { data: key } = await sb.from("api_keys").select("*").eq("id", keyId).single();
        if (!key) {
          await send(BOT_TOKEN, chatId, msgId, "المفتاح غير موجود.", [[{ text: "🔙 رجوع", callback_data: `ak_svc_${service}` }]]);
          return new Response("OK");
        }
        await send(BOT_TOKEN, chatId, msgId,
          `🔑 *مفتاح ${service}*\n\n` +
          `المفتاح: \`...${key.api_key.slice(-8)}\`\n` +
          `الحالة: ${key.is_blocked ? "🚫 محظور" : key.is_active ? "✅ نشط" : "⏸ معطل"}\n` +
          `الاستخدام: ${key.usage_count || 0}\n` +
          `${key.block_reason ? `السبب: ${key.block_reason}` : ""}`,
          [
            [
              key.is_blocked ? { text: "🔓 فك الحظر", callback_data: `ak_unblk_${service}_${keyId}` } : { text: "🚫 حظر", callback_data: `ak_blk_${service}_${keyId}` },
              { text: "🗑 حذف", callback_data: `ak_del_${service}_${keyId}` },
            ],
            [{ text: "🔙 رجوع", callback_data: `ak_list_${service}_0` }],
          ]
        );
        return new Response("OK");
      }

      if (d.startsWith("ak_unblk_")) {
        const parts = d.replace("ak_unblk_", "").split("_");
        const service = parts[0];
        const keyId = parts[1];
        await sb.from("api_keys").update({ is_blocked: false, block_reason: null }).eq("id", keyId);
        await send(BOT_TOKEN, chatId, msgId, "✅ تم فك الحظر", [[{ text: "🔙 رجوع", callback_data: `ak_svc_${service}` }]]);
        return new Response("OK");
      }

      if (d.startsWith("ak_blk_")) {
        const parts = d.replace("ak_blk_", "").split("_");
        const service = parts[0];
        const keyId = parts[1];
        await sb.from("api_keys").update({ is_blocked: true, block_reason: "Manual block" }).eq("id", keyId);
        await send(BOT_TOKEN, chatId, msgId, "🚫 تم الحظر", [[{ text: "🔙 رجوع", callback_data: `ak_svc_${service}` }]]);
        return new Response("OK");
      }

      if (d.startsWith("ak_del_")) {
        const parts = d.replace("ak_del_", "").split("_");
        const service = parts[0];
        const keyId = parts[1];
        await sb.from("api_keys").delete().eq("id", keyId);
        await send(BOT_TOKEN, chatId, msgId, "🗑 تم الحذف", [[{ text: "🔙 رجوع", callback_data: `ak_svc_${service}` }]]);
        return new Response("OK");
      }

      if (d.startsWith("ak_unblock_")) {
        const service = d.replace("ak_unblock_", "");
        await sb.from("api_keys").update({ is_blocked: false, block_reason: null }).eq("service", service);
        await send(BOT_TOKEN, chatId, msgId, "✅ تم فك حظر جميع المفاتيح", [[{ text: "🔙 رجوع", callback_data: `ak_svc_${service}` }]]);
        return new Response("OK");
      }


      if (d === "lemon_menu") {
        const { data: keys } = await sb.from("lemondata_keys").select("id, label, is_active, is_blocked, usage_count, error_count");
        const total = keys?.length || 0;
        const active = keys?.filter((k: any) => k.is_active && !k.is_blocked).length || 0;
        const blocked = keys?.filter((k: any) => k.is_blocked).length || 0;
        const totalUsage = keys?.reduce((sum: number, k: any) => sum + (k.usage_count || 0), 0) || 0;
        await send(BOT_TOKEN, chatId, msgId,
          `♾️ *Unlimited — LemonData Keys*\n\n` +
          `📊 إجمالي المفاتيح: *${total}*\n` +
          `✅ نشط: *${active}*\n` +
          `🚫 محظور: *${blocked}*\n` +
          `📈 إجمالي الاستخدام: *${totalUsage}*`,
          [
            [{ text: "➕ إضافة مفتاح", callback_data: "lemon_add" }],
            [{ text: "📋 قائمة المفاتيح", callback_data: "lemon_list_0" }],
            [{ text: "🔓 فك حظر الكل", callback_data: "lemon_unblock_all" }],
            [{ text: "🌐 النماذج المتاحة", callback_data: "lemon_models" }],
            [{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }],
          ]
        );
        return new Response("OK");
      }

      if (d === "lemon_add") {
        await saveSession(sb, chatId, { adminAction: "lemon_awaiting_key" } as any);
        await send(BOT_TOKEN, chatId, msgId,
          "➕ *إضافة مفتاح LemonData*\n\nأرسل المفتاح الآن:\n(يمكنك إرسال عدة مفاتيح، كل مفتاح في سطر)",
          [[{ text: "❌ إلغاء", callback_data: "lemon_menu" }]]
        );
        return new Response("OK");
      }

      if (d.startsWith("lemon_list_")) {
        const page = parseInt(d.split("_")[2]) || 0;
        const PAGE_SIZE = 8;
        const { data: keys } = await sb.from("lemondata_keys")
          .select("id, label, api_key, is_active, is_blocked, usage_count")
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        const { count } = await sb.from("lemondata_keys").select("id", { count: "exact", head: true });
        const totalPages = Math.ceil((count || 0) / PAGE_SIZE) || 1;

        if (!keys || keys.length === 0) {
          await send(BOT_TOKEN, chatId, msgId, "لا توجد مفاتيح.", [[{ text: "➕ إضافة", callback_data: "lemon_add" }, { text: "🔙 رجوع", callback_data: "lemon_menu" }]]);
          return new Response("OK");
        }

        const rows: { text: string; callback_data: string }[][] = keys.map((k: any) => [{
          text: `${k.is_blocked ? "🚫" : "✅"} ...${k.api_key.slice(-6)} (${k.usage_count || 0})`,
          callback_data: `lemon_key_${k.id}`,
        }]);

        const nav: { text: string; callback_data: string }[] = [];
        if (page > 0) nav.push({ text: "◀️", callback_data: `lemon_list_${page - 1}` });
        nav.push({ text: `${page + 1}/${totalPages}`, callback_data: "noop" });
        if (page < totalPages - 1) nav.push({ text: "▶️", callback_data: `lemon_list_${page + 1}` });
        rows.push(nav);
        rows.push([{ text: "🔙 رجوع", callback_data: "lemon_menu" }]);
        await send(BOT_TOKEN, chatId, msgId, `📋 *المفاتيح* (${count || 0}):`, rows);
        return new Response("OK");
      }

      if (d.startsWith("lemon_key_")) {
        const keyId = d.replace("lemon_key_", "");
        const { data: key } = await sb.from("lemondata_keys").select("*").eq("id", keyId).single();
        if (!key) { await send(BOT_TOKEN, chatId, msgId, "❌ مفتاح غير موجود", [[{ text: "🔙 رجوع", callback_data: "lemon_menu" }]]); return new Response("OK"); }
        await send(BOT_TOKEN, chatId, msgId,
          `🔑 *تفاصيل المفتاح*\n\n` +
          `المفتاح: \`...${key.api_key.slice(-8)}\`\n` +
          `الحالة: ${key.is_blocked ? "🚫 محظور" : key.is_active ? "✅ نشط" : "⏸ معطل"}\n` +
          `${key.block_reason ? `السبب: ${key.block_reason}\n` : ""}` +
          `الاستخدام: ${key.usage_count || 0}\n` +
          `الأخطاء: ${key.error_count || 0}\n` +
          `${key.label ? `التسمية: ${key.label}\n` : ""}`,
          [
            [
              key.is_blocked
                ? { text: "🔓 فك الحظر", callback_data: `lemon_unblock_${keyId}` }
                : { text: "🚫 حظر", callback_data: `lemon_block_${keyId}` },
              { text: "🗑 حذف", callback_data: `lemon_del_${keyId}` },
            ],
            [{ text: "🔙 رجوع", callback_data: "lemon_list_0" }],
          ]
        );
        return new Response("OK");
      }

      if (d.startsWith("lemon_block_")) {
        const keyId = d.replace("lemon_block_", "");
        await sb.from("lemondata_keys").update({ is_blocked: true, block_reason: "Manual block" }).eq("id", keyId);
        await send(BOT_TOKEN, chatId, msgId, "🚫 تم حظر المفتاح", [[{ text: "🔙 رجوع", callback_data: "lemon_menu" }]]);
        return new Response("OK");
      }

      if (d.startsWith("lemon_unblock_")) {
        const keyId = d.replace("lemon_unblock_", "");
        await sb.from("lemondata_keys").update({ is_blocked: false, block_reason: null, error_count: 0 }).eq("id", keyId);
        await send(BOT_TOKEN, chatId, msgId, "✅ تم فك حظر المفتاح", [[{ text: "🔙 رجوع", callback_data: "lemon_menu" }]]);
        return new Response("OK");
      }

      if (d === "lemon_unblock_all") {
        await sb.from("lemondata_keys").update({ is_blocked: false, block_reason: null, error_count: 0 }).eq("is_blocked", true);
        await send(BOT_TOKEN, chatId, msgId, "✅ تم فك حظر جميع المفاتيح", [[{ text: "🔙 رجوع", callback_data: "lemon_menu" }]]);
        return new Response("OK");
      }

      if (d.startsWith("lemon_del_")) {
        const keyId = d.replace("lemon_del_", "");
        await sb.from("lemondata_keys").delete().eq("id", keyId);
        await send(BOT_TOKEN, chatId, msgId, "🗑 تم حذف المفتاح", [[{ text: "🔙 رجوع", callback_data: "lemon_menu" }]]);
        return new Response("OK");
      }

      if (d === "lemon_done_adding") {
        await clearSession(sb, chatId);
        const { count } = await sb.from("lemondata_keys").select("id", { count: "exact", head: true });
        await send(BOT_TOKEN, chatId, msgId, `✅ تم الانتهاء من إضافة المفاتيح\n📊 إجمالي المفاتيح: *${count || 0}*`, [
          [{ text: "♾️ Unlimited", callback_data: "lemon_menu" }],
          [{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }],
        ]);
        return new Response("OK");
      }

      if (d === "lemon_models") {
        // Try to fetch models from LemonData API using first active key
        const { data: keys } = await sb.from("lemondata_keys").select("api_key").eq("is_active", true).eq("is_blocked", false).limit(1);
        if (!keys || keys.length === 0) {
          await send(BOT_TOKEN, chatId, msgId, "❌ لا توجد مفاتيح نشطة لجلب النماذج", [[{ text: "🔙 رجوع", callback_data: "lemon_menu" }]]);
          return new Response("OK");
        }
        try {
          const modelsResp = await fetch("https://api.lemondata.cc/v1/models", {
            headers: { Authorization: `Bearer ${keys[0].api_key}` },
          });
          const modelsData = await modelsResp.json();
          const models = modelsData.data || [];

          // Categorize
          const chat = models.filter((m: any) => m.id?.includes("gpt") || m.id?.includes("claude") || m.id?.includes("gemini") || m.id?.includes("grok") || m.id?.includes("qwen") || m.id?.includes("llama") || m.id?.includes("mistral"));
          const image = models.filter((m: any) => m.id?.includes("flux") || m.id?.includes("dall") || m.id?.includes("ideogram") || m.id?.includes("recraft") || m.id?.includes("imagen") || m.id?.includes("stable"));
          const video = models.filter((m: any) => m.id?.includes("kling") || m.id?.includes("veo") || m.id?.includes("sora") || m.id?.includes("wan") || m.id?.includes("luma") || m.id?.includes("pika"));
          const audio = models.filter((m: any) => m.id?.includes("tts") || m.id?.includes("whisper") || m.id?.includes("voice") || m.id?.includes("audio"));

          const text = `🌐 *النماذج المتاحة في LemonData*\n\n` +
            `💬 شات: *${chat.length}*\n` +
            (chat.slice(0, 10).map((m: any) => `  • \`${m.id}\``).join("\n")) +
            (chat.length > 10 ? `\n  ... و ${chat.length - 10} آخرين` : "") +
            `\n\n🖼 صور: *${image.length}*\n` +
            (image.slice(0, 8).map((m: any) => `  • \`${m.id}\``).join("\n")) +
            `\n\n🎬 فيديو: *${video.length}*\n` +
            (video.slice(0, 8).map((m: any) => `  • \`${m.id}\``).join("\n")) +
            `\n\n🔊 صوت: *${audio.length}*\n` +
            (audio.slice(0, 5).map((m: any) => `  • \`${m.id}\``).join("\n")) +
            `\n\n📊 الإجمالي: *${models.length}* نموذج`;

          await send(BOT_TOKEN, chatId, msgId, text, [[{ text: "🔙 رجوع", callback_data: "lemon_menu" }]]);
        } catch (e) {
          await send(BOT_TOKEN, chatId, msgId, `❌ خطأ: ${e}`, [[{ text: "🔙 رجوع", callback_data: "lemon_menu" }]]);
        }
        return new Response("OK");
      }

      // ==================== Tools (صور الأدوات) ====================
      if (d === "tools_menu") {
        const allTools = [
          { id: "inpaint", name: "Inpaint" }, { id: "clothes-changer", name: "Clothes Changer" },
          { id: "headshot", name: "Headshot" }, { id: "bg-remover", name: "BG Remover" },
          { id: "face-swap", name: "Face Swap" }, { id: "relight", name: "Relight" },
          { id: "colorizer", name: "Colorizer" }, { id: "character-swap", name: "Character Swap" },
          { id: "storyboard", name: "Storyboard" }, { id: "sketch-to-image", name: "Sketch to Image" },
          { id: "retouching", name: "Retouching" }, { id: "remover", name: "Object Remover" },
          { id: "hair-changer", name: "Hair Changer" }, { id: "cartoon", name: "Cartoon" },
          { id: "talking-photo", name: "Talking Photo" },
          { id: "video-upscale", name: "Video Upscale" },
          { id: "auto-caption", name: "Auto Caption" },
        ];
        const rows: { text: string; callback_data: string }[][] = [];
        // Two rows per tool pair
        for (let i = 0; i < allTools.length; i += 2) {
          const row: { text: string; callback_data: string }[] = [{ text: `🖼 ${allTools[i].name}`, callback_data: `tool_landing_${allTools[i].id}` }];
          if (allTools[i + 1]) row.push({ text: `🖼 ${allTools[i + 1].name}`, callback_data: `tool_landing_${allTools[i + 1].id}` });
          rows.push(row);
        }
        rows.push([{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }]);
        await send(BOT_TOKEN, chatId, msgId, "🛠 *إدارة صور الأدوات (Landing)*\n\nاختر أداة لتغيير صورتها ووصفها:", rows);
        return new Response("OK");
      }

      if (d.startsWith("tool_landing_")) {
        const toolId = d.replace("tool_landing_", "");
        const { data: existing } = await sb.from("tool_landing_images").select("*").eq("tool_id", toolId).maybeSingle();
        const kb: { text: string; callback_data: string }[][] = [
          [{ text: "🖼 صورة البطاقة (Card)", callback_data: `tool_set_card_${toolId}` }],
          [{ text: "📸 صورة Landing Page", callback_data: `tool_set_img_${toolId}` }],
          [{ text: "📝 تغيير الوصف", callback_data: `tool_set_desc_${toolId}` }],
          [{ text: "🔙 رجوع", callback_data: "tools_menu" }],
        ];
        await send(BOT_TOKEN, chatId, msgId,
          `🛠 *${toolId}*\n\n` +
          `صورة البطاقة: ${(existing as any)?.card_image_url ? "✅ موجودة" : "❌ غير موجودة"}\n` +
          `صورة Landing: ${existing?.image_url ? "✅ موجودة" : "❌ غير موجودة"}\n` +
          `الوصف: ${existing?.description || "لا يوجد"}`,
          kb
        );
        return new Response("OK");
      }

      if (d.startsWith("tool_set_card_")) {
        const toolId = d.replace("tool_set_card_", "");
        await saveSession(sb, chatId, { adminAction: "tool_awaiting_card_image", adminModelId: toolId } as any);
        await send(BOT_TOKEN, chatId, msgId,
          `🖼 *صورة البطاقة (Card)*\n\nالأداة: \`${toolId}\`\n\nأرسل الصورة التي ستظهر في بطاقة الأداة:`,
          [[{ text: "❌ إلغاء", callback_data: "tools_menu" }]]
        );
        return new Response("OK");
      }

      if (d.startsWith("tool_set_img_")) {
        const toolId = d.replace("tool_set_img_", "");
        await saveSession(sb, chatId, { adminAction: "tool_awaiting_image", adminModelId: toolId } as any);
        await send(BOT_TOKEN, chatId, msgId,
          `📸 *صورة Landing Page*\n\nالأداة: \`${toolId}\`\n\nأرسل صورة خلفية صفحة Landing:`,
          [[{ text: "❌ إلغاء", callback_data: "tools_menu" }]]
        );
        return new Response("OK");
      }

      if (d.startsWith("tool_set_desc_")) {
        const toolId = d.replace("tool_set_desc_", "");
        await saveSession(sb, chatId, { adminAction: "tool_awaiting_desc", adminModelId: toolId } as any);
        await send(BOT_TOKEN, chatId, msgId,
          `📝 *تغيير وصف الأداة*\n\nالأداة: \`${toolId}\`\n\nأرسل الوصف الجديد:`,
          [[{ text: "❌ إلغاء", callback_data: "tools_menu" }]]
        );
        return new Response("OK");
      }

      // ==================== Slide Templates ====================
      if (d === "slide_templates_menu") {
        const { data: templates, count } = await sb.from("slide_templates").select("*", { count: "exact" }).order("display_order");
        const rows: { text: string; callback_data: string }[][] = [];
        if (templates && templates.length > 0) {
          for (let i = 0; i < templates.length; i += 2) {
            const row: { text: string; callback_data: string }[] = [];
            row.push({ text: `${templates[i].template_id.slice(-8)}`, callback_data: `st_view_${templates[i].id}` });
            if (templates[i + 1]) row.push({ text: `${templates[i + 1].template_id.slice(-8)}`, callback_data: `st_view_${templates[i + 1].id}` });
            rows.push(row);
          }
        }
        rows.push([{ text: "➕ إضافة قالب", callback_data: "st_add" }]);
        rows.push([{ text: "🔙 رجوع", callback_data: "main_menu" }]);
        await send(BOT_TOKEN, chatId, msgId, `🎞️ *قوالب العروض (Slides)*\n\nالعدد: ${count || 0}`, rows);
        return new Response("OK");
      }

      if (d.startsWith("st_view_")) {
        const templateId = d.replace("st_view_", "");
        const { data: t } = await sb.from("slide_templates").select("*").eq("id", templateId).single();
        if (!t) { await send(BOT_TOKEN, chatId, msgId, "❌ قالب غير موجود", [[{ text: "🔙 رجوع", callback_data: "slide_templates_menu" }]]); return new Response("OK"); }
        const text = `🎞️ *Slide Template*\n\nID: \`${t.template_id}\`\nالحالة: ${t.is_active ? "✅ نشط" : "⏸ معطل"}\nالترتيب: ${t.display_order}\n${t.image_url ? `الصورة: [عرض](${t.image_url})` : "بدون صورة"}`;
        await send(BOT_TOKEN, chatId, msgId, text, [
          [{ text: t.is_active ? "⏸ تعطيل" : "✅ تفعيل", callback_data: `st_toggle_${t.id}` }],
          [{ text: "🖼 تغيير الصورة", callback_data: `st_img_${t.id}` }],
          [{ text: "🗑 حذف", callback_data: `st_del_${t.id}` }],
          [{ text: "🔙 رجوع", callback_data: "slide_templates_menu" }],
        ]);
        return new Response("OK");
      }

      if (d.startsWith("st_toggle_")) {
        const templateId = d.replace("st_toggle_", "");
        const { data: t } = await sb.from("slide_templates").select("is_active").eq("id", templateId).single();
        if (t) await sb.from("slide_templates").update({ is_active: !t.is_active }).eq("id", templateId);
        await send(BOT_TOKEN, chatId, msgId, `✅ تم ${t?.is_active ? "تعطيل" : "تفعيل"} القالب`, [[{ text: "🔙 رجوع", callback_data: "slide_templates_menu" }]]);
        return new Response("OK");
      }

      if (d.startsWith("st_del_")) {
        const templateId = d.replace("st_del_", "");
        await sb.from("slide_templates").delete().eq("id", templateId);
        await send(BOT_TOKEN, chatId, msgId, "✅ تم حذف القالب", [[{ text: "🔙 رجوع", callback_data: "slide_templates_menu" }]]);
        return new Response("OK");
      }

      if (d.startsWith("st_img_")) {
        const templateId = d.replace("st_img_", "");
        await saveSession(sb, chatId, { adminAction: "st_awaiting_image", adminModelId: templateId } as any);
        await send(BOT_TOKEN, chatId, msgId, "🖼 أرسل الصورة الجديدة للقالب:", [[{ text: "❌ إلغاء", callback_data: "slide_templates_menu" }]]);
        return new Response("OK");
      }

      if (d === "st_add") {
        await saveSession(sb, chatId, { adminAction: "st_awaiting_id" } as any);
        await send(BOT_TOKEN, chatId, msgId, "➕ *إضافة قالب عرض*\n\nأرسل معرف القالب (template\\_id) من 2Slides:", [[{ text: "❌ إلغاء", callback_data: "slide_templates_menu" }]]);
        return new Response("OK");
      }

      // ==================== Tool Templates (قوالب الأدوات) ====================
      if (d === "tool_templates_menu") {
        const toolsWithTemplates = [
          { id: "face-swap", name: "Face Swap" }, { id: "cartoon", name: "Cartoon" },
          { id: "hair-changer", name: "Hair Changer" }, { id: "character-swap", name: "Character Swap" },
          { id: "clothes-changer", name: "Clothes Changer" },
        ];
        const rows = toolsWithTemplates.map(t => [{ text: `📋 ${t.name}`, callback_data: `tt_tool_${t.id}` }]);
        rows.push([{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }]);
        await send(BOT_TOKEN, chatId, msgId, "📋 *إدارة قوالب الأدوات*\n\nاختر أداة:", rows);
        return new Response("OK");
      }

      if (d.startsWith("tt_tool_")) {
        const toolId = d.replace("tt_tool_", "");
        const { data: templates, count } = await sb.from("tool_templates").select("id, name, is_active, gender", { count: "exact" }).eq("tool_id", toolId);
        const rows: { text: string; callback_data: string }[][] = [
          [{ text: "➕ إضافة قالب", callback_data: `tt_add_${toolId}` }],
        ];
        if (templates && templates.length > 0) {
          templates.forEach((t: any) => {
            rows.push([{ text: `${t.is_active ? "✅" : "⏸"} ${t.name}`, callback_data: `tt_view_${t.id}` }]);
          });
        }
        rows.push([{ text: "🔙 رجوع", callback_data: "tool_templates_menu" }]);
        await send(BOT_TOKEN, chatId, msgId, `📋 *قوالب ${toolId}* (${count || 0})`, rows);
        return new Response("OK");
      }

      if (d.startsWith("tt_add_")) {
        const toolId = d.replace("tt_add_", "");
        await saveSession(sb, chatId, { adminAction: "tt_awaiting_name", adminModelId: toolId } as any);
        await send(BOT_TOKEN, chatId, msgId, `📋 *إضافة قالب لـ ${toolId}*\n\nأرسل اسم القالب:`, [[{ text: "❌ إلغاء", callback_data: `tt_tool_${toolId}` }]]);
        return new Response("OK");
      }

      if (d.startsWith("tt_view_")) {
        const templateId = d.replace("tt_view_", "");
        const { data: t } = await sb.from("tool_templates").select("*").eq("id", templateId).single();
        if (!t) { await send(BOT_TOKEN, chatId, msgId, "❌ قالب غير موجود", [[{ text: "🔙 رجوع", callback_data: "tool_templates_menu" }]]); return new Response("OK"); }
        await send(BOT_TOKEN, chatId, msgId,
          `📋 *${t.name}*\n\nالأداة: ${t.tool_id}\nالحالة: ${t.is_active ? "✅ نشط" : "⏸ معطل"}\n${t.gender ? `الجنس: ${t.gender}\n` : ""}البرومبت: ${(t.prompt || "").slice(0, 100)}...`,
          [
            [
              { text: t.is_active ? "⏸ تعطيل" : "✅ تفعيل", callback_data: `tt_toggle_${templateId}` },
              { text: "🗑 حذف", callback_data: `tt_del_${templateId}` },
            ],
            [{ text: "🔙 رجوع", callback_data: `tt_tool_${t.tool_id}` }],
          ]
        );
        return new Response("OK");
      }

      if (d.startsWith("tt_toggle_")) {
        const templateId = d.replace("tt_toggle_", "");
        const { data: t } = await sb.from("tool_templates").select("is_active, tool_id").eq("id", templateId).single();
        if (t) await sb.from("tool_templates").update({ is_active: !t.is_active }).eq("id", templateId);
        await send(BOT_TOKEN, chatId, msgId, "✅ تم تحديث الحالة", [[{ text: "🔙 رجوع", callback_data: `tt_tool_${t?.tool_id || "face-swap"}` }]]);
        return new Response("OK");
      }

      if (d.startsWith("tt_del_")) {
        const templateId = d.replace("tt_del_", "");
        const { data: t } = await sb.from("tool_templates").select("tool_id").eq("id", templateId).single();
        await sb.from("tool_templates").delete().eq("id", templateId);
        await send(BOT_TOKEN, chatId, msgId, "🗑 تم حذف القالب", [[{ text: "🔙 رجوع", callback_data: `tt_tool_${t?.tool_id || "face-swap"}` }]]);
        return new Response("OK");
      }

      if (d.startsWith("tt_gender_")) {
        // tt_gender_male or tt_gender_female
        const gender = d.replace("tt_gender_", "");
        const session = await loadSession(sb, chatId);
        if (!session) return new Response("OK");
        (session as any).ttGender = gender;
        (session as any).adminAction = "tt_awaiting_prompt";
        await saveSession(sb, chatId, session);
        await send(BOT_TOKEN, chatId, msgId, `✅ الجنس: ${gender}\n\nأرسل البرومبت (prompt) للقالب:`, [[{ text: "❌ إلغاء", callback_data: "tool_templates_menu" }]]);
        return new Response("OK");
      }

      // ==================== Headshot Templates ====================
      if (d === "headshot_menu") {
        const { data: templates, count } = await sb.from("headshot_templates").select("id, name, gender, is_active", { count: "exact" });
        const total = count || 0;
        const rows: { text: string; callback_data: string }[][] = [
          [{ text: "➕ إضافة قالب", callback_data: "hs_add" }],
        ];
        if (templates && templates.length > 0) {
          templates.forEach((t: any) => {
            rows.push([{ text: `${t.is_active ? "✅" : "⏸"} ${t.name} (${t.gender})`, callback_data: `hs_view_${t.id}` }]);
          });
        }
        rows.push([{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }]);
        await send(BOT_TOKEN, chatId, msgId, `📷 *قوالب Headshot* (${total})`, rows);
        return new Response("OK");
      }

      if (d === "hs_add") {
        await saveSession(sb, chatId, { adminAction: "hs_awaiting_name" } as any);
        await send(BOT_TOKEN, chatId, msgId, "📷 *إضافة قالب Headshot*\n\nأرسل اسم القالب:", [[{ text: "❌ إلغاء", callback_data: "headshot_menu" }]]);
        return new Response("OK");
      }

      if (d.startsWith("hs_view_")) {
        const templateId = d.replace("hs_view_", "");
        const { data: t } = await sb.from("headshot_templates").select("*").eq("id", templateId).single();
        if (!t) { await send(BOT_TOKEN, chatId, msgId, "❌ قالب غير موجود", [[{ text: "🔙 رجوع", callback_data: "headshot_menu" }]]); return new Response("OK"); }
        await send(BOT_TOKEN, chatId, msgId,
          `📷 *${t.name}*\n\nالجنس: ${t.gender}\nالحالة: ${t.is_active ? "✅ نشط" : "⏸ معطل"}\nالبرومبت: ${(t.prompt || "").slice(0, 100)}...`,
          [
            [
              { text: t.is_active ? "⏸ تعطيل" : "✅ تفعيل", callback_data: `hs_toggle_${templateId}` },
              { text: "🗑 حذف", callback_data: `hs_del_${templateId}` },
            ],
            [{ text: "🔙 رجوع", callback_data: "headshot_menu" }],
          ]
        );
        return new Response("OK");
      }

      if (d.startsWith("hs_toggle_")) {
        const templateId = d.replace("hs_toggle_", "");
        const { data: t } = await sb.from("headshot_templates").select("is_active").eq("id", templateId).single();
        if (t) await sb.from("headshot_templates").update({ is_active: !t.is_active }).eq("id", templateId);
        await send(BOT_TOKEN, chatId, msgId, "✅ تم تحديث الحالة", [[{ text: "🔙 رجوع", callback_data: "headshot_menu" }]]);
        return new Response("OK");
      }

      if (d.startsWith("hs_del_")) {
        const templateId = d.replace("hs_del_", "");
        await sb.from("headshot_templates").delete().eq("id", templateId);
        await send(BOT_TOKEN, chatId, msgId, "🗑 تم حذف القالب", [[{ text: "🔙 رجوع", callback_data: "headshot_menu" }]]);
        return new Response("OK");
      }

      if (d.startsWith("hs_gender_")) {
        const gender = d.replace("hs_gender_", "");
        const session = await loadSession(sb, chatId);
        if (!session) return new Response("OK");
        (session as any).hsGender = gender;
        (session as any).adminAction = "hs_awaiting_prompt";
        await saveSession(sb, chatId, session);
        await send(BOT_TOKEN, chatId, msgId, `✅ الجنس: ${gender}\n\nأرسل البرومبت (prompt) للقالب:`, [[{ text: "❌ إلغاء", callback_data: "headshot_menu" }]]);
        return new Response("OK");
      }

      // Skip callbacks for headshot & tool templates
      if (d === "hs_skip_image") {
        const session = await loadSession(sb, chatId);
        if (!session) return new Response("OK");
        const { error } = await sb.from("headshot_templates").insert({
          name: (session as any).hsName || "Untitled",
          gender: (session as any).hsGender || "male",
          prompt: (session as any).hsPrompt || "",
          preview_url: null,
        });
        await clearSession(sb, chatId);
        await send(BOT_TOKEN, chatId, msgId,
          error ? `❌ خطأ: ${error.message}` : `✅ تم إضافة قالب *${(session as any).hsName}* بدون صورة`,
          [[{ text: "➕ آخر", callback_data: "hs_add" }], [{ text: "📷 القوالب", callback_data: "headshot_menu" }]]
        );
        return new Response("OK");
      }

      if (d === "tt_gender_skip") {
        const session = await loadSession(sb, chatId);
        if (!session) return new Response("OK");
        (session as any).ttGender = null;
        (session as any).adminAction = "tt_awaiting_prompt";
        await saveSession(sb, chatId, session);
        await send(BOT_TOKEN, chatId, msgId, "أرسل البرومبت (prompt) للقالب:", [[{ text: "❌ إلغاء", callback_data: "tool_templates_menu" }]]);
        return new Response("OK");
      }

      if (d === "tt_skip_image") {
        const session = await loadSession(sb, chatId);
        if (!session) return new Response("OK");
        const toolId = (session as any).adminModelId;
        const { error } = await sb.from("tool_templates").insert({
          tool_id: toolId,
          name: (session as any).ttName || "Untitled",
          gender: (session as any).ttGender || null,
          prompt: (session as any).ttPrompt || "",
          preview_url: null,
        });
        await clearSession(sb, chatId);
        await send(BOT_TOKEN, chatId, msgId,
          error ? `❌ خطأ: ${error.message}` : `✅ تم إضافة قالب *${(session as any).ttName}* بدون صورة`,
          [[{ text: "➕ آخر", callback_data: `tt_add_${toolId}` }], [{ text: "📋 القوالب", callback_data: `tt_tool_${toolId}` }]]
        );
        return new Response("OK");
      }

      if (d === "st_skip_image") {
        const session = await loadSession(sb, chatId);
        if (!session) return new Response("OK");
        const { count } = await sb.from("slide_templates").select("*", { count: "exact", head: true });
        await sb.from("slide_templates").insert({
          template_id: (session as any).stTemplateId,
          image_url: null,
          display_order: (count || 0) + 1,
          is_active: true,
        });
        await clearSession(sb, chatId);
        await send(BOT_TOKEN, chatId, msgId,
          `✅ تم إضافة القالب: \`${(session as any).stTemplateId}\` بدون صورة`,
          [[{ text: "🔙 رجوع", callback_data: "slide_templates_menu" }]]
        );
        return new Response("OK");
      }

      // ==================== Voice Templates ====================
      if (d === "voice_templates_menu") {
        const { data: templates, count } = await sb.from("voice_templates").select("id, name, is_active, audio_file_url", { count: "exact" });
        const total = count || 0;
        const rows: { text: string; callback_data: string }[][] = [
          [{ text: "➕ إضافة قالب صوتي", callback_data: "vt_add" }],
        ];
        if (templates && templates.length > 0) {
          templates.forEach((t: any) => {
            rows.push([{ text: `${t.is_active ? "✅" : "⏸"} ${t.name}`, callback_data: `vt_view_${t.id}` }]);
          });
        }
        rows.push([{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }]);
        await send(BOT_TOKEN, chatId, msgId, `🎤 *قوالب الصوت* (${total})`, rows);
        return new Response("OK");
      }

      if (d === "vt_add") {
        await saveSession(sb, chatId, { adminAction: "vt_awaiting_name" } as any);
        await send(BOT_TOKEN, chatId, msgId, "🎤 *إضافة قالب صوتي*\n\nأرسل اسم القالب:", [[{ text: "❌ إلغاء", callback_data: "voice_templates_menu" }]]);
        return new Response("OK");
      }

      if (d.startsWith("vt_view_")) {
        const tid = d.replace("vt_view_", "");
        const { data: t } = await sb.from("voice_templates").select("*").eq("id", tid).single();
        if (!t) { await send(BOT_TOKEN, chatId, msgId, "❌ غير موجود", [[{ text: "🔙", callback_data: "voice_templates_menu" }]]); return new Response("OK"); }
        await send(BOT_TOKEN, chatId, msgId,
          `🎤 *${t.name}*\nالحالة: ${t.is_active ? "✅ نشط" : "⏸ معطل"}`,
          [
            [{ text: t.is_active ? "⏸ تعطيل" : "✅ تفعيل", callback_data: `vt_toggle_${tid}` }, { text: "🗑 حذف", callback_data: `vt_del_${tid}` }],
            [{ text: "🔙 رجوع", callback_data: "voice_templates_menu" }],
          ]
        );
        return new Response("OK");
      }

      if (d.startsWith("vt_toggle_")) {
        const tid = d.replace("vt_toggle_", "");
        const { data: t } = await sb.from("voice_templates").select("is_active").eq("id", tid).single();
        if (t) await sb.from("voice_templates").update({ is_active: !t.is_active }).eq("id", tid);
        await send(BOT_TOKEN, chatId, msgId, "✅ تم التحديث", [[{ text: "🔙", callback_data: "voice_templates_menu" }]]);
        return new Response("OK");
      }

      if (d.startsWith("vt_del_")) {
        const tid = d.replace("vt_del_", "");
        await sb.from("voice_templates").delete().eq("id", tid);
        await send(BOT_TOKEN, chatId, msgId, "🗑 تم الحذف", [[{ text: "🔙", callback_data: "voice_templates_menu" }]]);
        return new Response("OK");
      }

      // ==================== TTS Voices ====================
      if (d === "tts_voices_menu") {
        const { data: voices, count } = await sb.from("tts_voices").select("id, name, is_active, voice_id", { count: "exact" });
        const total = count || 0;
        const rows: { text: string; callback_data: string }[][] = [
          [{ text: "➕ إضافة صوت TTS", callback_data: "tv_add" }],
        ];
        if (voices && voices.length > 0) {
          voices.forEach((v: any) => {
            rows.push([{ text: `${v.is_active ? "✅" : "⏸"} ${v.name}`, callback_data: `tv_view_${v.id}` }]);
          });
        }
        rows.push([{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }]);
        await send(BOT_TOKEN, chatId, msgId, `🔊 *أصوات TTS* (${total})`, rows);
        return new Response("OK");
      }

      if (d === "tv_add") {
        await saveSession(sb, chatId, { adminAction: "tv_awaiting_name" } as any);
        await send(BOT_TOKEN, chatId, msgId, "🔊 *إضافة صوت TTS*\n\nأرسل اسم الصوت:", [[{ text: "❌ إلغاء", callback_data: "tts_voices_menu" }]]);
        return new Response("OK");
      }

      if (d.startsWith("tv_view_")) {
        const vid = d.replace("tv_view_", "");
        const { data: v } = await sb.from("tts_voices").select("*").eq("id", vid).single();
        if (!v) { await send(BOT_TOKEN, chatId, msgId, "❌ غير موجود", [[{ text: "🔙", callback_data: "tts_voices_menu" }]]); return new Response("OK"); }
        await send(BOT_TOKEN, chatId, msgId,
          `🔊 *${v.name}*\nVoice ID: \`${v.voice_id || "—"}\`\nالحالة: ${v.is_active ? "✅" : "⏸"}`,
          [
            [{ text: v.is_active ? "⏸ تعطيل" : "✅ تفعيل", callback_data: `tv_toggle_${vid}` }, { text: "🗑 حذف", callback_data: `tv_del_${vid}` }],
            [{ text: "🔙 رجوع", callback_data: "tts_voices_menu" }],
          ]
        );
        return new Response("OK");
      }

      if (d.startsWith("tv_toggle_")) {
        const vid = d.replace("tv_toggle_", "");
        const { data: v } = await sb.from("tts_voices").select("is_active").eq("id", vid).single();
        if (v) await sb.from("tts_voices").update({ is_active: !v.is_active }).eq("id", vid);
        await send(BOT_TOKEN, chatId, msgId, "✅ تم التحديث", [[{ text: "🔙", callback_data: "tts_voices_menu" }]]);
        return new Response("OK");
      }

      if (d.startsWith("tv_del_")) {
        const vid = d.replace("tv_del_", "");
        await sb.from("tts_voices").delete().eq("id", vid);
        await send(BOT_TOKEN, chatId, msgId, "🗑 تم الحذف", [[{ text: "🔙", callback_data: "tts_voices_menu" }]]);
        return new Response("OK");
      }

      // ==================== رفع الوسائط ====================
      if (d === "upload_menu") {
        await send(BOT_TOKEN, chatId, msgId, "📤 *رفع الوسائط*\n\nاختر القسم:", [
          [{ text: "🖼 نماذج الصور", callback_data: "page_images" }, { text: "🎬 نماذج الفيديو", callback_data: "page_videos" }],
          [{ text: "📊 حالة الرفع", callback_data: "upload_status" }],
          [{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }],
        ]);
        return new Response("OK");
      }

      if (d === "upload_status") {
        const added = await loadAddedModels(sb);
        const imgIds = added.filter((m: any) => m.type === "image" || m.type === "image-tool").map((m: any) => m.id);
        const vidIds = added.filter((m: any) => ["video", "video-i2v", "video-avatar"].includes(m.type)).map((m: any) => m.id);
        const imgEx = await getExistingMedia(sb, imgIds);
        const vidEx = await getExistingMedia(sb, vidIds);
        await send(BOT_TOKEN, chatId, msgId,
          `📊 *حالة الرفع*\n\n🖼 الصور: ${imgEx.size}/${imgIds.length} ✅\n🎬 الفيديو: ${vidEx.size}/${vidIds.length} ✅`,
          [[{ text: "🔙 رجوع", callback_data: "upload_menu" }]]
        );
        return new Response("OK");
      }

      if (d === "page_images" || d === "page_videos") {
        const pg = d === "page_images" ? "images" : "videos";
        const added = await loadAddedModels(sb);
        const all = pg === "images"
          ? added.filter((m: any) => m.type === "image" || m.type === "image-tool").map((m: any) => m.id)
          : added.filter((m: any) => ["video", "video-i2v", "video-avatar"].includes(m.type)).map((m: any) => m.id);
        // Update MODEL_NAMES
        added.forEach((m: any) => { if (m.name) MODEL_NAMES[m.id] = m.name; });
        const existing = await getExistingMedia(sb, all);
        const remaining = all.filter((m: string) => !existing.has(m));

        if (remaining.length === 0) {
          await send(BOT_TOKEN, chatId, msgId, `✅ كل نماذج ${pg === "images" ? "الصور" : "الفيديو"} لديها وسائط بالفعل!`, [[{ text: "🔙 رجوع", callback_data: "upload_menu" }]]);
          return new Response("OK");
        }

        const session: BotSession = { page: pg, modelIndex: 0, models: remaining };
        await saveSession(sb, chatId, session);
        const modelId = remaining[0];
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `*رفع ${pg === "images" ? "الصور 🖼" : "الفيديو 🎬"}*\nالمتبقي: *${remaining.length}*\n\n🎯 النموذج: *${MODEL_NAMES[modelId] || modelId}*\n\`${modelId}\`\n\nأرسل ${pg === "images" ? "صورة" : "فيديو"}:`,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [
            [{ text: "⏭ تخطي", callback_data: "skip_model" }, { text: "❌ إلغاء", callback_data: "upload_menu" }],
          ]}),
        });
        return new Response("OK");
      }

      if (d === "skip_model") {
        const session = await loadSession(sb, chatId);
        if (!session?.models) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "لا توجد جلسة نشطة. اضغط /start" }); return new Response("OK"); }
        session.modelIndex = (session.modelIndex || 0) + 1;
        if (session.modelIndex >= session.models.length) {
          await clearSession(sb, chatId);
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "✅ تم الانتهاء من كل النماذج!", reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 رجوع", callback_data: "upload_menu" }]] }) });
          return new Response("OK");
        }
        await saveSession(sb, chatId, session);
        const mid = session.models[session.modelIndex];
        const rem = session.models.length - session.modelIndex;
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `⏭ تم التخطي\n\nالمتبقي: *${rem}*\n\n🎯 النموذج: *${MODEL_NAMES[mid] || mid}*\n\`${mid}\`\n\nأرسل ${session.page === "images" ? "صورة" : "فيديو"}:`,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "⏭ تخطي", callback_data: "skip_model" }, { text: "❌ إلغاء", callback_data: "upload_menu" }]] }),
        });
        return new Response("OK");
      }

      // ==================== تعديل النماذج ====================
      if (d === "edit_menu") {
        const cats = await getDynamicCategories(sb);
        const kb = dynamicCatsKB(cats, "edit");
        kb.push([{ text: "➕ إضافة نموذج جديد", callback_data: "add_model" }]);
        kb.push([{ text: "👁 النماذج المخفية", callback_data: "hidden_models" }]);
        kb.push([{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }]);
        await send(BOT_TOKEN, chatId, msgId, "✏️ *تعديل النماذج*\n\nاختر القسم:", kb);
        return new Response("OK");
      }

      if (d.startsWith("cat_edit_")) {
        const catKey = d.replace("cat_edit_", "");
        const cats = await getDynamicCategories(sb);
        const cat = cats.find(c => c.key === catKey);
        if (!cat) return new Response("OK");
        await send(BOT_TOKEN, chatId, msgId, `✏️ *${cat.emoji} ${cat.label}*\n\nاختر نموذج للتعديل:`, modelListKB(cat.models, 0, catKey, "emod"));
        return new Response("OK");
      }

      if (d.startsWith("nav_emod_")) {
        const parts = d.replace("nav_emod_", "").split("_");
        const catKey = parts[0];
        const page = parseInt(parts[1]) || 0;
        const cats = await getDynamicCategories(sb);
        const cat = cats.find(c => c.key === catKey);
        if (!cat) return new Response("OK");
        await send(BOT_TOKEN, chatId, msgId, `✏️ *${cat.emoji} ${cat.label}* — صفحة ${page + 1}`, modelListKB(cat.models, page, catKey, "emod"));
        return new Response("OK");
      }

      if (d === "back_emod_cats") {
        const cats = await getDynamicCategories(sb);
        const kb = dynamicCatsKB(cats, "edit");
        kb.push([{ text: "➕ إضافة نموذج جديد", callback_data: "add_model" }]);
        kb.push([{ text: "👁 النماذج المخفية", callback_data: "hidden_models" }]);
        kb.push([{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }]);
        await send(BOT_TOKEN, chatId, msgId, "✏️ *تعديل النماذج*\n\nاختر القسم:", kb);
        return new Response("OK");
      }

      // نموذج مختار للتعديل
      if (d.startsWith("emod_")) {
        const modelId = d.replace("emod_", "");
        const config = await getModelConfig(sb, modelId);
        const name = config.name || MODEL_NAMES[modelId] || modelId;
        await saveSession(sb, chatId, { adminAction: "editing", adminModelId: modelId });

        const fieldRows: { text: string; callback_data: string }[][] = [];
        for (let i = 0; i < FIELDS.length; i += 2) {
          const row: { text: string; callback_data: string }[] = [];
          const f1 = FIELDS[i];
          const v1 = config[f1.key] || "—";
          row.push({ text: `${f1.label}: ${v1.length > 10 ? v1.slice(0, 10) + "…" : v1}`, callback_data: `ef_${f1.key}` });
          if (FIELDS[i + 1]) {
            const f2 = FIELDS[i + 1];
            const v2 = config[f2.key] || "—";
            row.push({ text: `${f2.label}: ${v2.length > 10 ? v2.slice(0, 10) + "…" : v2}`, callback_data: `ef_${f2.key}` });
          }
          fieldRows.push(row);
        }
        fieldRows.push([{ text: "🎛 التخصيص", callback_data: "cust" }, { text: "🏷 الشارات", callback_data: "bdg" }]);
        fieldRows.push([{ text: "📷 رفع أيقونة", callback_data: "icn_up" }]);
        fieldRows.push([{ text: "🗑 إعادة ضبط", callback_data: `reset_${modelId}` }, { text: "🚫 إخفاء", callback_data: `hide_${modelId}` }]);
        fieldRows.push([{ text: "🔙 رجوع", callback_data: "edit_menu" }]);

        await send(BOT_TOKEN, chatId, msgId,
          `🔧 *${name}*\n📌 \`${modelId}\`\n\n` +
          FIELDS.map(f => `${f.label}: \`${config[f.key] || "افتراضي"}\``).join("\n") +
          "\n\nاضغط على الحقل للتعديل:",
          fieldRows
        );
        return new Response("OK");
      }

      // حقل مختار للتعديل
      if (d.startsWith("ef_")) {
        const field = d.replace("ef_", "");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const fieldLabel = FIELDS.find(f => f.key === field)?.label || field;

        if (field === "credits") {
          await saveSession(sb, chatId, { ...session, adminAction: "awaiting_value", adminField: field });
          await send(BOT_TOKEN, chatId, msgId, `💰 *تحديد تكلفة MC* لـ \`${session.adminModelId}\`\n\nاختر قيمة أو أدخل يدوياً:`, [
            [{ text: "1", callback_data: "sv_credits_1" }, { text: "2", callback_data: "sv_credits_2" }, { text: "3", callback_data: "sv_credits_3" }],
            [{ text: "4", callback_data: "sv_credits_4" }, { text: "5", callback_data: "sv_credits_5" }, { text: "6", callback_data: "sv_credits_6" }],
            [{ text: "8", callback_data: "sv_credits_8" }, { text: "10", callback_data: "sv_credits_10" }, { text: "15", callback_data: "sv_credits_15" }],
            [{ text: "20", callback_data: "sv_credits_20" }, { text: "30", callback_data: "sv_credits_30" }, { text: "50", callback_data: "sv_credits_50" }],
            [{ text: "✏️ قيمة مخصصة", callback_data: "sv_credits_custom" }],
            [{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }],
          ]);
          return new Response("OK");
        }

        if (field === "type") {
          await saveSession(sb, chatId, { ...session, adminAction: "awaiting_value", adminField: field });
          await send(BOT_TOKEN, chatId, msgId, `📦 *نوع النموذج* لـ \`${session.adminModelId}\`:`, [
            [{ text: "🖼 image", callback_data: "sv_type_image" }, { text: "🔧 image-tool", callback_data: "sv_type_image-tool" }],
            [{ text: "🎬 video", callback_data: "sv_type_video" }, { text: "🎬 video-i2v", callback_data: "sv_type_video-i2v" }],
            [{ text: "💬 chat", callback_data: "sv_type_chat" }, { text: "👤 video-avatar", callback_data: "sv_type_video-avatar" }],
            [{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }],
          ]);
          return new Response("OK");
        }

        if (field === "speed") {
          await saveSession(sb, chatId, { ...session, adminAction: "awaiting_value", adminField: field });
          await send(BOT_TOKEN, chatId, msgId, `⚡ *سرعة النموذج* لـ \`${session.adminModelId}\`:`, [
            [{ text: "⚡ fast", callback_data: "sv_speed_fast" }, { text: "🔄 standard", callback_data: "sv_speed_standard" }, { text: "🐢 slow", callback_data: "sv_speed_slow" }],
            [{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }],
          ]);
          return new Response("OK");
        }

        if (field === "quality") {
          await saveSession(sb, chatId, { ...session, adminAction: "awaiting_value", adminField: field });
          await send(BOT_TOKEN, chatId, msgId, `🎯 *جودة النموذج* لـ \`${session.adminModelId}\`:`, [
            [{ text: "📊 standard", callback_data: "sv_quality_standard" }, { text: "✨ high", callback_data: "sv_quality_high" }, { text: "👑 ultra", callback_data: "sv_quality_ultra" }],
            [{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }],
          ]);
          return new Response("OK");
        }

        if (field === "requiresImage") {
          await saveSession(sb, chatId, { ...session, adminAction: "awaiting_value", adminField: field });
          await send(BOT_TOKEN, chatId, msgId, `📸 *يتطلب صورة؟* لـ \`${session.adminModelId}\`:`, [
            [{ text: "✅ نعم", callback_data: "sv_requiresImage_true" }, { text: "❌ لا", callback_data: "sv_requiresImage_false" }],
            [{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }],
          ]);
          return new Response("OK");
        }

        if (field === "maxImages") {
          await saveSession(sb, chatId, { ...session, adminAction: "awaiting_value", adminField: field });
          await send(BOT_TOKEN, chatId, msgId, `🔢 *أقصى عدد صور* لـ \`${session.adminModelId}\`:`, [
            [{ text: "0", callback_data: "sv_maxImages_0" }, { text: "1", callback_data: "sv_maxImages_1" }, { text: "2", callback_data: "sv_maxImages_2" }, { text: "4", callback_data: "sv_maxImages_4" }],
            [{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }],
          ]);
          return new Response("OK");
        }

        if (field === "provider") {
          await saveSession(sb, chatId, { ...session, adminAction: "awaiting_value", adminField: field });
          await send(BOT_TOKEN, chatId, msgId, `🏷 *تحديد المزود* لـ \`${session.adminModelId}\`:`, [
            [{ text: "fal.ai", callback_data: "sv_provider_fal" }, { text: "OpenRouter", callback_data: "sv_provider_openrouter" }],
            [{ text: "داخلي", callback_data: "sv_provider_internal" }, { text: "مخصص", callback_data: "sv_provider_custom" }],
            [{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }],
          ]);
          return new Response("OK");
        }

        // Capabilities - toggle selection
        if (field === "capabilities") {
          const config = await getModelConfig(sb, session.adminModelId);
          const current = (config.capabilities || "").split(",").filter(Boolean);
          await saveSession(sb, chatId, { ...session, adminAction: "cap_editing", adminField: field });
          const rows: { text: string; callback_data: string }[][] = [];
          for (let i = 0; i < CAPABILITY_OPTIONS.length; i += 2) {
            const row: { text: string; callback_data: string }[] = [];
            const c1 = CAPABILITY_OPTIONS[i];
            const on1 = current.includes(c1.key);
            row.push({ text: `${on1 ? "✅" : "⬜"} ${c1.label}`, callback_data: `cap_${c1.key}` });
            if (CAPABILITY_OPTIONS[i + 1]) {
              const c2 = CAPABILITY_OPTIONS[i + 1];
              const on2 = current.includes(c2.key);
              row.push({ text: `${on2 ? "✅" : "⬜"} ${c2.label}`, callback_data: `cap_${c2.key}` });
            }
            rows.push(row);
          }
          rows.push([{ text: "💾 حفظ القدرات", callback_data: "cap_save" }]);
          rows.push([{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }]);
          await send(BOT_TOKEN, chatId, msgId, `🛠 *قدرات النموذج* لـ \`${session.adminModelId}\`\n\nالمحدد: ${current.length > 0 ? current.join(", ") : "لا شيء"}\n\nاضغط لتفعيل/تعطيل:`, rows);
          return new Response("OK");
        }

        // fal_id - prefix suggestions
        if (field === "fal_id") {
          await saveSession(sb, chatId, { ...session, adminAction: "awaiting_value", adminField: field });
          const config = await getModelConfig(sb, session.adminModelId);
          const prefixRows: { text: string; callback_data: string }[][] = [];
          for (let i = 0; i < FAL_PREFIXES.length; i += 2) {
            const row: { text: string; callback_data: string }[] = [];
            row.push({ text: FAL_PREFIXES[i].label, callback_data: `falpfx_${i}` });
            if (FAL_PREFIXES[i + 1]) row.push({ text: FAL_PREFIXES[i + 1].label, callback_data: `falpfx_${i + 1}` });
            prefixRows.push(row);
          }
          prefixRows.push([{ text: "✏️ إدخال يدوي كامل", callback_data: "sv_fal_id_custom" }]);
          prefixRows.push([{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }]);
          await send(BOT_TOKEN, chatId, msgId, `🔗 *معرف fal.ai* لـ \`${session.adminModelId}\`\nالحالي: \`${config.fal_id || "غير محدد"}\`\n\nاختر بادئة أو أدخل المعرف كاملاً:\nمثال: \`fal-ai/nano-banana-pro/edit\``, prefixRows);
          return new Response("OK");
        }

        // openrouter_id - common prefixes
        if (field === "openrouter_id") {
          await saveSession(sb, chatId, { ...session, adminAction: "awaiting_value", adminField: field });
          const config = await getModelConfig(sb, session.adminModelId);
          await send(BOT_TOKEN, chatId, msgId, `🔗 *معرف OpenRouter* لـ \`${session.adminModelId}\`\nالحالي: \`${config.openrouter_id || "غير محدد"}\`\n\nاختر بادئة أو أدخل المعرف:`, [
            [{ text: "openai/", callback_data: "orpfx_openai/" }, { text: "google/", callback_data: "orpfx_google/" }],
            [{ text: "x-ai/", callback_data: "orpfx_x-ai/" }, { text: "deepseek/", callback_data: "orpfx_deepseek/" }],
            [{ text: "meta-llama/", callback_data: "orpfx_meta-llama/" }, { text: "anthropic/", callback_data: "orpfx_anthropic/" }],
            [{ text: "✏️ إدخال يدوي", callback_data: "sv_openrouter_id_custom" }],
            [{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }],
          ]);
          return new Response("OK");
        }

        await saveSession(sb, chatId, { ...session, adminAction: "awaiting_value", adminField: field });
        await send(BOT_TOKEN, chatId, msgId, `✏️ ${fieldLabel}\n\nأدخل القيمة الجديدة لـ \`${session.adminModelId}\`:`, [[{ text: "🔙 إلغاء", callback_data: `emod_${session.adminModelId}` }]]);
        return new Response("OK");
      }

      // ---- Capabilities toggle ----
      if (d.startsWith("cap_") && d !== "cap_save") {
        const capKey = d.replace("cap_", "");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        const current = (config.capabilities || "").split(",").filter(Boolean);
        const idx = current.indexOf(capKey);
        if (idx >= 0) current.splice(idx, 1); else current.push(capKey);
        config.capabilities = current.join(",");
        await setModelConfig(sb, session.adminModelId, config);
        // Re-render toggle grid
        const rows: { text: string; callback_data: string }[][] = [];
        for (let i = 0; i < CAPABILITY_OPTIONS.length; i += 2) {
          const row: { text: string; callback_data: string }[] = [];
          const c1 = CAPABILITY_OPTIONS[i];
          row.push({ text: `${current.includes(c1.key) ? "✅" : "⬜"} ${c1.label}`, callback_data: `cap_${c1.key}` });
          if (CAPABILITY_OPTIONS[i + 1]) {
            const c2 = CAPABILITY_OPTIONS[i + 1];
            row.push({ text: `${current.includes(c2.key) ? "✅" : "⬜"} ${c2.label}`, callback_data: `cap_${c2.key}` });
          }
          rows.push(row);
        }
        rows.push([{ text: "💾 حفظ القدرات", callback_data: "cap_save" }]);
        rows.push([{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }]);
        await send(BOT_TOKEN, chatId, msgId, `🛠 *قدرات النموذج* لـ \`${session.adminModelId}\`\n\nالمحدد: ${current.length > 0 ? current.join(", ") : "لا شيء"}\n\nاضغط لتفعيل/تعطيل:`, rows);
        return new Response("OK");
      }

      if (d === "cap_save") {
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        await send(BOT_TOKEN, chatId, msgId, `✅ تم حفظ القدرات: \`${config.capabilities || "لا شيء"}\``, [
          [{ text: "✏️ تعديل المزيد", callback_data: `emod_${session.adminModelId}` }],
          [{ text: "🔙 القائمة", callback_data: "edit_menu" }],
        ]);
        await saveSession(sb, chatId, { adminAction: "idle" });
        return new Response("OK");
      }

      // ---- fal prefix selection ----
      if (d.startsWith("falpfx_")) {
        const idx = parseInt(d.replace("falpfx_", ""));
        const prefix = FAL_PREFIXES[idx]?.value || "fal-ai/";
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        await saveSession(sb, chatId, { ...session, adminAction: "awaiting_fal_suffix", adminField: "fal_id" });
        await send(BOT_TOKEN, chatId, msgId, `🔗 البادئة: \`${prefix}\`\n\nأدخل باقي المعرف:\nمثال: إذا المعرف \`fal-ai/nano-banana-pro/edit\`\nأدخل: \`nano-banana-pro/edit\``, [[{ text: "🔙 إلغاء", callback_data: `emod_${session.adminModelId}` }]]);
        // Store prefix temporarily
        await saveSession(sb, chatId, { ...session, adminAction: "awaiting_fal_suffix", adminField: "fal_id", addModelData: { ...session.addModelData, _falPrefix: prefix } });
        return new Response("OK");
      }

      // ---- OpenRouter prefix selection ----
      if (d.startsWith("orpfx_")) {
        const prefix = d.replace("orpfx_", "");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        await saveSession(sb, chatId, { ...session, adminAction: "awaiting_or_suffix", adminField: "openrouter_id", addModelData: { ...session.addModelData, _orPrefix: prefix } });
        await send(BOT_TOKEN, chatId, msgId, `🔗 البادئة: \`${prefix}\`\n\nأدخل اسم النموذج:\nمثال: \`gpt-5\` أو \`gemini-2.5-pro\``, [[{ text: "🔙 إلغاء", callback_data: `emod_${session.adminModelId}` }]]);
        return new Response("OK");
      }

      // تعيين قيمة
      if (d.startsWith("sv_")) {
        const raw = d.replace("sv_", "");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");

        // Handle compound field names like fal_id, openrouter_id
        const knownFields = FIELDS.map(f => f.key);
        let field = "";
        let value = "";
        for (const f of knownFields) {
          if (raw.startsWith(f + "_")) {
            field = f;
            value = raw.slice(f.length + 1);
            break;
          }
        }
        if (!field) {
          const parts = raw.split("_");
          field = parts[0];
          value = parts.slice(1).join("_");
        }

        if (value === "custom") {
          await saveSession(sb, chatId, { ...session, adminAction: "awaiting_value", adminField: field });
          await send(BOT_TOKEN, chatId, msgId, `✏️ أدخل قيمة مخصصة لـ *${field}*:`, [[{ text: "🔙 إلغاء", callback_data: `emod_${session.adminModelId}` }]]);
          return new Response("OK");
        }

        const config = await getModelConfig(sb, session.adminModelId);
        config[field] = value;
        await setModelConfig(sb, session.adminModelId, config);
        await send(BOT_TOKEN, chatId, msgId, `✅ تم تحديث *${field}* → \`${value}\``, [
          [{ text: "✏️ تعديل المزيد", callback_data: `emod_${session.adminModelId}` }],
          [{ text: "🔙 القائمة", callback_data: "edit_menu" }],
        ]);
        await saveSession(sb, chatId, { adminAction: "idle" });
        return new Response("OK");
      }

      // إعادة ضبط
      if (d.startsWith("reset_")) {
        const modelId = d.replace("reset_", "");
        await sb.from("memories").delete().eq("key", `model_config_${modelId}`);
        await send(BOT_TOKEN, chatId, msgId, `🗑 تم إعادة ضبط \`${modelId}\``, [
          [{ text: "✏️ تعديل", callback_data: `emod_${modelId}` }],
          [{ text: "🔙 القائمة", callback_data: "edit_menu" }],
        ]);
        return new Response("OK");
      }

      // ==================== إخفاء نموذج ====================
      if (d.startsWith("hide_")) {
        const modelId = d.replace("hide_", "");
        const { data: hiddenData } = await sb.from("memories").select("value").eq("key", "models_hidden").maybeSingle();
        const hidden: string[] = hiddenData?.value ? JSON.parse(hiddenData.value) : [];
        if (!hidden.includes(modelId)) hidden.push(modelId);
        await sb.from("memories").delete().eq("key", "models_hidden");
        await sb.from("memories").insert({ key: "models_hidden", value: JSON.stringify(hidden) });
        await send(BOT_TOKEN, chatId, msgId, `🚫 تم إخفاء النموذج \`${modelId}\`\n\nلن يظهر للمستخدمين.`, [
          [{ text: "👁 النماذج المخفية", callback_data: "hidden_models" }],
          [{ text: "🔙 القائمة", callback_data: "edit_menu" }],
        ]);
        return new Response("OK");
      }

      // عرض النماذج المخفية
      if (d === "hidden_models") {
        const { data: hiddenData } = await sb.from("memories").select("value").eq("key", "models_hidden").maybeSingle();
        const hidden: string[] = hiddenData?.value ? JSON.parse(hiddenData.value) : [];
        if (hidden.length === 0) {
          await send(BOT_TOKEN, chatId, msgId, "👁 لا توجد نماذج مخفية.", [
            [{ text: "🔙 رجوع", callback_data: "edit_menu" }],
          ]);
          return new Response("OK");
        }
        const rows = hidden.map(id => [{
          text: `${MODEL_NAMES[id] || id}`,
          callback_data: `unhide_${id}`,
        }]);
        rows.push([{ text: "🗑 إظهار الكل", callback_data: "unhide_all" }]);
        rows.push([{ text: "🔙 رجوع", callback_data: "edit_menu" }]);
        await send(BOT_TOKEN, chatId, msgId, `👁 *النماذج المخفية (${hidden.length})*\n\nاضغط على النموذج لإظهاره:`, rows);
        return new Response("OK");
      }

      if (d.startsWith("unhide_")) {
        const val = d.replace("unhide_", "");
        const { data: hiddenData } = await sb.from("memories").select("value").eq("key", "models_hidden").maybeSingle();
        let hidden: string[] = hiddenData?.value ? JSON.parse(hiddenData.value) : [];
        if (val === "all") {
          hidden = [];
        } else {
          hidden = hidden.filter(id => id !== val);
        }
        await sb.from("memories").delete().eq("key", "models_hidden");
        if (hidden.length > 0) {
          await sb.from("memories").insert({ key: "models_hidden", value: JSON.stringify(hidden) });
        }
        await send(BOT_TOKEN, chatId, msgId, val === "all" ? "✅ تم إظهار كل النماذج." : `✅ تم إظهار النموذج \`${val}\`.`, [
          [{ text: "👁 النماذج المخفية", callback_data: "hidden_models" }],
          [{ text: "🔙 القائمة", callback_data: "edit_menu" }],
        ]);
        return new Response("OK");
      }

      // ==================== إضافة نموذج جديد ====================
      if (d === "add_model") {
        await saveSession(sb, chatId, { addModelStep: "awaiting_id", addModelData: {} });
        await send(BOT_TOKEN, chatId, msgId, "➕ *إضافة نموذج جديد*\n\n📌 الخطوة 1/5: أدخل معرف النموذج (ID):\n\nمثال: `my-new-model`", [
          [{ text: "🔙 إلغاء", callback_data: "edit_menu" }],
        ]);
        return new Response("OK");
      }

      // Select type for new model
      if (d.startsWith("am_type_")) {
        const type = d.replace("am_type_", "");
        const session = await loadSession(sb, chatId);
        if (!session?.addModelData) return new Response("OK");
        session.addModelData.type = type;
        session.addModelStep = "awaiting_credits";
        await saveSession(sb, chatId, session);
        await send(BOT_TOKEN, chatId, msgId, `✅ النوع: *${type}*\n\n💰 الخطوة 4/5: أدخل تكلفة MC:`, [
          [{ text: "1", callback_data: "am_cr_1" }, { text: "2", callback_data: "am_cr_2" }, { text: "3", callback_data: "am_cr_3" }],
          [{ text: "4", callback_data: "am_cr_4" }, { text: "5", callback_data: "am_cr_5" }, { text: "8", callback_data: "am_cr_8" }],
          [{ text: "10", callback_data: "am_cr_10" }, { text: "15", callback_data: "am_cr_15" }, { text: "20", callback_data: "am_cr_20" }],
          [{ text: "✏️ مخصص", callback_data: "am_cr_custom" }],
          [{ text: "🔙 إلغاء", callback_data: "edit_menu" }],
        ]);
        return new Response("OK");
      }

      // Set credits for new model
      if (d.startsWith("am_cr_")) {
        const val = d.replace("am_cr_", "");
        const session = await loadSession(sb, chatId);
        if (!session?.addModelData) return new Response("OK");
        if (val === "custom") {
          session.addModelStep = "awaiting_credits_text";
          await saveSession(sb, chatId, session);
          await send(BOT_TOKEN, chatId, msgId, "💰 أدخل تكلفة MC يدوياً:", [[{ text: "🔙 إلغاء", callback_data: "edit_menu" }]]);
          return new Response("OK");
        }
        session.addModelData.credits = val;
        session.addModelStep = "awaiting_description";
        await saveSession(sb, chatId, session);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ التكلفة: *${val} MC*\n\n📝 الخطوة 5/5: أدخل وصف النموذج:`, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "⏭ تخطي", callback_data: "am_save" }], [{ text: "🔙 إلغاء", callback_data: "edit_menu" }]] }),
        });
        return new Response("OK");
      }

      // Save new model
      if (d === "am_save") {
        const session = await loadSession(sb, chatId);
        if (!session?.addModelData?.id) return new Response("OK");
        const md = session.addModelData;

        // Load existing added models
        const { data: addedData } = await sb.from("memories").select("value").eq("key", "models_added").maybeSingle();
        const added: Record<string, unknown>[] = addedData?.value ? JSON.parse(addedData.value) : [];

        added.push({
          id: md.id, name: md.name || md.id, type: md.type || "image",
          credits: Number(md.credits) || 0, description: md.description || "",
          longDescription: md.description || "", icon: "Image",
          modes: ["text-to-image"], acceptsImages: false, requiresImage: false,
          maxImages: 0, acceptedMimeTypes: [], provider: "Megsy",
          speed: "standard", quality: "high",
        });

        await sb.from("memories").delete().eq("key", "models_added");
        await sb.from("memories").insert({ key: "models_added", value: JSON.stringify(added) });
        await clearSession(sb, chatId);

        await send(BOT_TOKEN, chatId, msgId,
          `✅ *تم إضافة النموذج بنجاح!*\n\n📌 ID: \`${md.id}\`\n📛 الاسم: *${md.name || md.id}*\n📦 النوع: ${md.type || "image"}\n💰 التكلفة: ${md.credits || 0} MC`,
          [
            [{ text: "✏️ تعديل الإعدادات", callback_data: `emod_${md.id}` }],
            [{ text: "➕ إضافة نموذج آخر", callback_data: "add_model" }],
            [{ text: "🔙 القائمة", callback_data: "edit_menu" }],
          ]
        );
        return new Response("OK");
      }

      // حذف نموذج مضاف (من models_added)
      if (d.startsWith("del_added_")) {
        const modelId = d.replace("del_added_", "");
        const { data: addedData } = await sb.from("memories").select("value").eq("key", "models_added").maybeSingle();
        let added: Record<string, unknown>[] = addedData?.value ? JSON.parse(addedData.value) : [];
        added = added.filter((m: any) => m.id !== modelId);
        await sb.from("memories").delete().eq("key", "models_added");
        if (added.length > 0) {
          await sb.from("memories").insert({ key: "models_added", value: JSON.stringify(added) });
        }
        await sb.from("memories").delete().eq("key", `model_config_${modelId}`);
        await send(BOT_TOKEN, chatId, msgId, `🗑 تم حذف النموذج \`${modelId}\` نهائياً.`, [
          [{ text: "🔙 القائمة", callback_data: "edit_menu" }],
        ]);
        return new Response("OK");
      }

      // ==================== التخصيص (Customization) ====================
      if (d === "cust") {
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        if (config.customization) { try { cust = JSON.parse(config.customization); } catch {} }

        const rows: { text: string; callback_data: string }[][] = [];
        for (let i = 0; i < CUST_FEATURES.length; i += 2) {
          const row: { text: string; callback_data: string }[] = [];
          const f1 = CUST_FEATURES[i];
          const on1 = cust[f1.key]?.on !== false;
          row.push({ text: `${on1 ? "✅" : "⬜"} ${f1.emoji} ${f1.label}`, callback_data: `ct_${f1.key}` });
          if (CUST_FEATURES[i + 1]) {
            const f2 = CUST_FEATURES[i + 1];
            const on2 = cust[f2.key]?.on !== false;
            row.push({ text: `${on2 ? "✅" : "⬜"} ${f2.emoji} ${f2.label}`, callback_data: `ct_${f2.key}` });
          }
          rows.push(row);
        }
        rows.push([{ text: "💾 حفظ التخصيص", callback_data: "cust_save" }]);
        rows.push([{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }]);
        await send(BOT_TOKEN, chatId, msgId, `🎛 *تخصيص النموذج* \`${session.adminModelId}\`\n\nاضغط على الميزة لتفعيلها/تعطيلها.\nبعد التفعيل اضغط عليها لتعديل الخيارات والأسعار:`, rows);
        return new Response("OK");
      }

      // Toggle a customization feature on/off or enter its options
      if (d.startsWith("ct_")) {
        const feat = d.replace("ct_", "");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        if (config.customization) { try { cust = JSON.parse(config.customization); } catch {} }

        if (!cust[feat]) cust[feat] = { on: true, options: {} };
        else cust[feat].on = !cust[feat].on;

        config.customization = JSON.stringify(cust);
        await setModelConfig(sb, session.adminModelId, config);

        // If just toggled ON and has options, show options editor
        if (cust[feat].on && CUST_OPTIONS[feat]) {
          const opts = CUST_OPTIONS[feat];
          const prices = cust[feat].options || {};
          const rows: { text: string; callback_data: string }[][] = [];
          for (let i = 0; i < opts.length; i += 3) {
            const row: { text: string; callback_data: string }[] = [];
            for (let j = i; j < Math.min(i + 3, opts.length); j++) {
              const p = prices[opts[j]] ?? 0;
              row.push({ text: `${opts[j]} (${p >= 0 ? "+" : ""}${p} MC)`, callback_data: `co_${feat}_${opts[j]}` });
            }
            rows.push(row);
          }
          rows.push([{ text: "✅ تم", callback_data: "cust" }]);
          await send(BOT_TOKEN, chatId, msgId, `📐 *خيارات ${CUST_FEATURES.find(f => f.key === feat)?.label || feat}*\n\nاضغط على الخيار لتعديل سعره:`, rows);
          return new Response("OK");
        }

        // Re-render main customization menu
        const rows: { text: string; callback_data: string }[][] = [];
        for (let i = 0; i < CUST_FEATURES.length; i += 2) {
          const row: { text: string; callback_data: string }[] = [];
          const f1 = CUST_FEATURES[i];
          const on1 = cust[f1.key]?.on !== false && cust[f1.key];
          row.push({ text: `${on1 ? "✅" : "⬜"} ${f1.emoji} ${f1.label}`, callback_data: `ct_${f1.key}` });
          if (CUST_FEATURES[i + 1]) {
            const f2 = CUST_FEATURES[i + 1];
            const on2 = cust[f2.key]?.on !== false && cust[f2.key];
            row.push({ text: `${on2 ? "✅" : "⬜"} ${f2.emoji} ${f2.label}`, callback_data: `ct_${f2.key}` });
          }
          rows.push(row);
        }
        rows.push([{ text: "💾 حفظ التخصيص", callback_data: "cust_save" }]);
        rows.push([{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }]);
        await send(BOT_TOKEN, chatId, msgId, `🎛 *تخصيص النموذج* \`${session.adminModelId}\`\n\nاضغط لتفعيل/تعطيل:`, rows);
        return new Response("OK");
      }

      // Select price for a customization option
      if (d.startsWith("co_")) {
        const parts = d.replace("co_", "").split("_");
        const feat = parts[0];
        const opt = parts.slice(1).join("_");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");

        // Show price picker
        const rows: { text: string; callback_data: string }[][] = [];
        for (let i = 0; i < CUST_PRICES.length; i += 4) {
          const row: { text: string; callback_data: string }[] = [];
          for (let j = i; j < Math.min(i + 4, CUST_PRICES.length); j++) {
            const p = CUST_PRICES[j];
            row.push({ text: `${p >= 0 ? "+" : ""}${p} MC`, callback_data: `cpr_${feat}_${opt}_${p}` });
          }
          rows.push(row);
        }
        rows.push([{ text: "🔙 رجوع للخيارات", callback_data: `ct_${feat}` }]);
        await send(BOT_TOKEN, chatId, msgId, `💰 *سعر الخيار* \`${opt}\` في ${CUST_FEATURES.find(f => f.key === feat)?.label || feat}:\n\nاختر تعديل السعر (MC):`, rows);
        return new Response("OK");
      }

      // Set price for customization option
      if (d.startsWith("cpr_")) {
        const parts = d.replace("cpr_", "").split("_");
        const price = parseInt(parts.pop()!);
        const opt = parts.pop()!;
        const feat = parts.join("_");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");

        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        if (config.customization) { try { cust = JSON.parse(config.customization); } catch {} }
        if (!cust[feat]) cust[feat] = { on: true, options: {} };
        if (!cust[feat].options) cust[feat].options = {};
        cust[feat].options[opt] = price;
        config.customization = JSON.stringify(cust);
        await setModelConfig(sb, session.adminModelId, config);

        // Show options again
        const opts = CUST_OPTIONS[feat] || [];
        const prices = cust[feat].options || {};
        const rows: { text: string; callback_data: string }[][] = [];
        for (let i = 0; i < opts.length; i += 3) {
          const row: { text: string; callback_data: string }[] = [];
          for (let j = i; j < Math.min(i + 3, opts.length); j++) {
            const p = prices[opts[j]] ?? 0;
            row.push({ text: `${opts[j]} (${p >= 0 ? "+" : ""}${p} MC)`, callback_data: `co_${feat}_${opts[j]}` });
          }
          rows.push(row);
        }
        rows.push([{ text: "✅ تم", callback_data: "cust" }]);
        await send(BOT_TOKEN, chatId, msgId, `✅ تم تحديث سعر \`${opt}\` → ${price >= 0 ? "+" : ""}${price} MC\n\n📐 *خيارات ${CUST_FEATURES.find(f => f.key === feat)?.label || feat}*:`, rows);
        return new Response("OK");
      }

      if (d === "cust_save") {
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        await send(BOT_TOKEN, chatId, msgId, `✅ تم حفظ تخصيص النموذج \`${session.adminModelId}\``, [
          [{ text: "✏️ تعديل المزيد", callback_data: `emod_${session.adminModelId}` }],
          [{ text: "🔙 القائمة", callback_data: "edit_menu" }],
        ]);
        return new Response("OK");
      }

      // ==================== الشارات (Badges) ====================
      if (d === "bdg") {
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        const current = (config.badges || "").split(",").filter(Boolean);

        const rows: { text: string; callback_data: string }[][] = [];
        for (let i = 0; i < BADGE_OPTIONS.length; i += 3) {
          const row: { text: string; callback_data: string }[] = [];
          for (let j = i; j < Math.min(i + 3, BADGE_OPTIONS.length); j++) {
            const b = BADGE_OPTIONS[j];
            const on = current.includes(b);
            row.push({ text: `${on ? "✅" : "⬜"} ${b}`, callback_data: `bdg_${b}` });
          }
          rows.push(row);
        }
        rows.push([{ text: "💾 حفظ الشارات", callback_data: "bdg_save" }]);
        rows.push([{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }]);
        await send(BOT_TOKEN, chatId, msgId, `🏷 *شارات النموذج* \`${session.adminModelId}\`\n\nالمحدد: ${current.length > 0 ? current.join(", ") : "لا شيء"}\n\nاضغط لتفعيل/تعطيل:`, rows);
        return new Response("OK");
      }

      if (d.startsWith("bdg_") && d !== "bdg_save") {
        const badge = d.replace("bdg_", "");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        const current = (config.badges || "").split(",").filter(Boolean);
        const idx = current.indexOf(badge);
        if (idx >= 0) current.splice(idx, 1); else current.push(badge);
        config.badges = current.join(",");
        await setModelConfig(sb, session.adminModelId, config);

        // Re-render
        const rows: { text: string; callback_data: string }[][] = [];
        for (let i = 0; i < BADGE_OPTIONS.length; i += 3) {
          const row: { text: string; callback_data: string }[] = [];
          for (let j = i; j < Math.min(i + 3, BADGE_OPTIONS.length); j++) {
            const b = BADGE_OPTIONS[j];
            const on = current.includes(b);
            row.push({ text: `${on ? "✅" : "⬜"} ${b}`, callback_data: `bdg_${b}` });
          }
          rows.push(row);
        }
        rows.push([{ text: "💾 حفظ الشارات", callback_data: "bdg_save" }]);
        rows.push([{ text: "🔙 رجوع", callback_data: `emod_${session.adminModelId}` }]);
        await send(BOT_TOKEN, chatId, msgId, `🏷 *شارات النموذج* \`${session.adminModelId}\`\n\nالمحدد: ${current.length > 0 ? current.join(", ") : "لا شيء"}`, rows);
        return new Response("OK");
      }

      if (d === "bdg_save") {
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        await send(BOT_TOKEN, chatId, msgId, `✅ تم حفظ الشارات: ${config.badges || "لا شيء"}`, [
          [{ text: "✏️ تعديل المزيد", callback_data: `emod_${session.adminModelId}` }],
          [{ text: "🔙 القائمة", callback_data: "edit_menu" }],
        ]);
        return new Response("OK");
      }

      // ==================== رفع أيقونة ====================
      if (d === "icn_up") {
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        await saveSession(sb, chatId, { ...session, adminAction: "awaiting_icon" });
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `📷 *رفع أيقونة* لـ \`${session.adminModelId}\`\n\nأرسل صورة (PNG/SVG) للأيقونة:`,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 إلغاء", callback_data: `emod_${session.adminModelId}` }]] }),
        });
        return new Response("OK");
      }

      // ==================== إدارة المستخدمين ====================
      if (d === "users_menu") {
        await showUsersPage(sb, BOT_TOKEN, chatId, msgId, 0);
        return new Response("OK");
      }

      if (d.startsWith("users_page_")) {
        const page = parseInt(d.replace("users_page_", "")) || 0;
        await showUsersPage(sb, BOT_TOKEN, chatId, msgId, page);
        return new Response("OK");
      }

      if (d.startsWith("uview_")) {
        const userId = d.replace("uview_", "");
        const { data: profile } = await sb.from("profiles").select("*").eq("id", userId).single();
        if (!profile) { await send(BOT_TOKEN, chatId, msgId, "❌ المستخدم غير موجود", [[{ text: "🔙 رجوع", callback_data: "users_menu" }]]); return new Response("OK"); }

        await saveSession(sb, chatId, { adminUserId: userId });
        await send(BOT_TOKEN, chatId, msgId,
          `👤 *${profile.display_name || "مستخدم"}*\n\n` +
          `🆔 \`${profile.id}\`\n` +
          `💰 الرصيد: *${Number(profile.credits).toFixed(1)} MC*\n` +
          `📋 الخطة: *${profile.plan}*\n` +
          `📅 تاريخ التسجيل: ${new Date(profile.created_at).toLocaleDateString("ar-EG")}`,
          [
            [{ text: "➕ إضافة رصيد", callback_data: `uadd_${userId}` }, { text: "➖ خصم رصيد", callback_data: `usub_${userId}` }],
            [{ text: "⭐ تغيير الخطة", callback_data: `uplan_${userId}` }],
            [{ text: "🔙 المستخدمين", callback_data: "users_menu" }],
          ]
        );
        return new Response("OK");
      }

      if (d.startsWith("uadd_")) {
        const userId = d.replace("uadd_", "");
        await send(BOT_TOKEN, chatId, msgId, "➕ *إضافة رصيد MC*\n\nاختر المبلغ:", [
          [{ text: "+5", callback_data: `mc_add_5_${userId}` }, { text: "+10", callback_data: `mc_add_10_${userId}` }, { text: "+25", callback_data: `mc_add_25_${userId}` }],
          [{ text: "+50", callback_data: `mc_add_50_${userId}` }, { text: "+100", callback_data: `mc_add_100_${userId}` }, { text: "+500", callback_data: `mc_add_500_${userId}` }],
          [{ text: "✏️ مبلغ مخصص", callback_data: `mc_custom_add_${userId}` }],
          [{ text: "🔙 رجوع", callback_data: `uview_${userId}` }],
        ]);
        return new Response("OK");
      }

      if (d.startsWith("usub_")) {
        const userId = d.replace("usub_", "");
        await send(BOT_TOKEN, chatId, msgId, "➖ *خصم رصيد MC*\n\nاختر المبلغ:", [
          [{ text: "-5", callback_data: `mc_sub_5_${userId}` }, { text: "-10", callback_data: `mc_sub_10_${userId}` }, { text: "-25", callback_data: `mc_sub_25_${userId}` }],
          [{ text: "-50", callback_data: `mc_sub_50_${userId}` }, { text: "-100", callback_data: `mc_sub_100_${userId}` }],
          [{ text: "✏️ مبلغ مخصص", callback_data: `mc_custom_sub_${userId}` }],
          [{ text: "🔙 رجوع", callback_data: `uview_${userId}` }],
        ]);
        return new Response("OK");
      }

      if (d.startsWith("mc_add_") || d.startsWith("mc_sub_")) {
        const isAdd = d.startsWith("mc_add_");
        const rest = d.replace(isAdd ? "mc_add_" : "mc_sub_", "");
        const idx = rest.indexOf("_");
        const amount = parseInt(rest.slice(0, idx));
        const userId = rest.slice(idx + 1);
        await applyMcChange(sb, BOT_TOKEN, chatId, msgId, userId, isAdd ? amount : -amount);
        return new Response("OK");
      }

      if (d.startsWith("mc_custom_add_") || d.startsWith("mc_custom_sub_")) {
        const isAdd = d.startsWith("mc_custom_add_");
        const userId = d.replace(isAdd ? "mc_custom_add_" : "mc_custom_sub_", "");
        await saveSession(sb, chatId, { adminAction: isAdd ? "mc_add" : "mc_sub", adminUserId: userId });
        await send(BOT_TOKEN, chatId, msgId, `✏️ أدخل المبلغ ${isAdd ? "المراد إضافته" : "المراد خصمه"}:`, [[{ text: "🔙 إلغاء", callback_data: `uview_${userId}` }]]);
        return new Response("OK");
      }

      if (d.startsWith("uplan_")) {
        const userId = d.replace("uplan_", "");
        await send(BOT_TOKEN, chatId, msgId, "⭐ *تغيير الخطة*\n\nاختر الخطة:", [
          [{ text: "🆓 Free", callback_data: `sp_free_${userId}` }, { text: "⭐ Starter", callback_data: `sp_starter_${userId}` }],
          [{ text: "💎 Pro", callback_data: `sp_pro_${userId}` }, { text: "👑 Elite", callback_data: `sp_elite_${userId}` }],
          [{ text: "🔙 رجوع", callback_data: `uview_${userId}` }],
        ]);
        return new Response("OK");
      }

      if (d.startsWith("sp_")) {
        const rest = d.replace("sp_", "");
        const idx = rest.indexOf("_");
        const plan = rest.slice(0, idx);
        const userId = rest.slice(idx + 1);
        await sb.from("profiles").update({ plan }).eq("id", userId);
        const { data: profile } = await sb.from("profiles").select("display_name").eq("id", userId).single();
        await send(BOT_TOKEN, chatId, msgId, `✅ تم تغيير خطة *${profile?.display_name || "المستخدم"}* إلى *${plan}*`, [
          [{ text: "👤 عرض المستخدم", callback_data: `uview_${userId}` }],
          [{ text: "🔙 المستخدمين", callback_data: "users_menu" }],
        ]);
        return new Response("OK");
      }

      // ==================== OAuth Apps ====================
      if (d === "oauth_menu") {
        await clearSession(sb, chatId);
        await send(BOT_TOKEN, chatId, msgId, "🔑 *OAuth Apps*\n\nإدارة تطبيقات تسجيل الدخول:", [
          [{ text: "➕ إنشاء تطبيق جديد", callback_data: "oauth_create" }],
          [{ text: "📋 عرض التطبيقات", callback_data: "oauth_list" }],
          [{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }],
        ]);
        return new Response("OK");
      }

      if (d === "oauth_create") {
        await saveSession(sb, chatId, { oauthStep: "awaiting_name" });
        await send(BOT_TOKEN, chatId, msgId, "➕ *إنشاء تطبيق OAuth جديد*\n\nأدخل اسم التطبيق:", [
          [{ text: "🔙 إلغاء", callback_data: "oauth_menu" }],
        ]);
        return new Response("OK");
      }

      if (d === "oauth_list") {
        const { data: apps } = await sb.from("oauth_clients").select("*").order("created_at", { ascending: false });
        if (!apps || apps.length === 0) {
          await send(BOT_TOKEN, chatId, msgId, "📋 لا توجد تطبيقات OAuth حالياً.", [
            [{ text: "➕ إنشاء تطبيق", callback_data: "oauth_create" }],
            [{ text: "🔙 رجوع", callback_data: "oauth_menu" }],
          ]);
          return new Response("OK");
        }

        const rows = apps.map(app => [{
          text: `${app.name} (${app.client_id.slice(0, 8)}...)`,
          callback_data: `oapp_${app.id}`,
        }]);
        rows.push([{ text: "🔙 رجوع", callback_data: "oauth_menu" }]);
        await send(BOT_TOKEN, chatId, msgId, `📋 *تطبيقات OAuth* (${apps.length})`, rows);
        return new Response("OK");
      }

      if (d.startsWith("oapp_")) {
        const appId = d.replace("oapp_", "");
        const { data: app } = await sb.from("oauth_clients").select("*").eq("id", appId).single();
        if (!app) { await send(BOT_TOKEN, chatId, msgId, "❌ التطبيق غير موجود", [[{ text: "🔙 رجوع", callback_data: "oauth_list" }]]); return new Response("OK"); }

        const uris = (app.redirect_uris || []).join("\n") || "لم يتم تحديد";
        const logoStatus = app.logo_url ? "✅" : "❌";
        await send(BOT_TOKEN, chatId, msgId,
          `🔑 *${app.name}*\n\n` +
          `📌 Client ID:\n\`${app.client_id}\`\n\n` +
          `🔗 Redirect URIs:\n${uris}\n\n` +
          `🖼 Logo: ${logoStatus}\n` +
          `🔓 Public: ${app.is_public ? "نعم" : "لا"}\n` +
          `📅 ${new Date(app.created_at).toLocaleDateString("ar-EG")}`,
          [
            [{ text: "✏️ تعديل الاسم", callback_data: `oedit_name_${appId}` }],
            [{ text: "🖼 تعديل الصورة", callback_data: `oedit_logo_${appId}` }],
            [{ text: "🔗 تعديل Redirect URIs", callback_data: `oedit_uri_${appId}` }],
            [{ text: "🔄 إعادة توليد Secret", callback_data: `oregen_${appId}` }],
            [{ text: "🗑 حذف", callback_data: `odel_${appId}` }],
            [{ text: "🔙 رجوع", callback_data: "oauth_list" }],
          ]
        );
        return new Response("OK");
      }

      if (d.startsWith("oedit_name_")) {
        const appId = d.replace("oedit_name_", "");
        await saveSession(sb, chatId, { oauthStep: "edit_name", oauthAppId: appId });
        await send(BOT_TOKEN, chatId, msgId, "✏️ أدخل الاسم الجديد للتطبيق:", [
          [{ text: "🔙 إلغاء", callback_data: `oapp_${appId}` }],
        ]);
        return new Response("OK");
      }

      if (d.startsWith("oedit_uri_")) {
        const appId = d.replace("oedit_uri_", "");
        await saveSession(sb, chatId, { oauthStep: "edit_uri", oauthAppId: appId });
        await send(BOT_TOKEN, chatId, msgId, "🔗 أدخل Redirect URIs الجديدة\n(كل URI في سطر منفصل):", [
          [{ text: "🔙 إلغاء", callback_data: `oapp_${appId}` }],
        ]);
        return new Response("OK");
      }

      if (d.startsWith("oedit_logo_")) {
        const appId = d.replace("oedit_logo_", "");
        await saveSession(sb, chatId, { oauthStep: "edit_logo", oauthAppId: appId });
        await send(BOT_TOKEN, chatId, msgId, "🖼 أرسل صورة الشعار الجديدة للتطبيق:", [
          [{ text: "🗑 حذف الصورة", callback_data: `odel_logo_${appId}` }],
          [{ text: "🔙 إلغاء", callback_data: `oapp_${appId}` }],
        ]);
        return new Response("OK");
      }

      if (d.startsWith("odel_logo_")) {
        const appId = d.replace("odel_logo_", "");
        await sb.from("oauth_clients").update({ logo_url: null }).eq("id", appId);
        await clearSession(sb, chatId);
        await send(BOT_TOKEN, chatId, msgId, "✅ تم حذف صورة التطبيق.", [
          [{ text: "🔙 رجوع للتطبيق", callback_data: `oapp_${appId}` }],
        ]);
        return new Response("OK");
      }

      if (d.startsWith("oregen_")) {
        const appId = d.replace("oregen_", "");
        const newSecret = generateId(48);
        const hashed = await hashSecret(newSecret);
        await sb.from("oauth_clients").update({ client_secret_hash: hashed }).eq("id", appId);
        await send(BOT_TOKEN, chatId, msgId,
          `🔄 *تم إعادة توليد Client Secret*\n\n⚠️ احفظه الآن — لن يظهر مرة أخرى!\n\n\`${newSecret}\``,
          [[{ text: "🔙 رجوع للتطبيق", callback_data: `oapp_${appId}` }]]
        );
        return new Response("OK");
      }

      if (d.startsWith("odel_confirm_")) {
        const appId = d.replace("odel_confirm_", "");
        await sb.from("oauth_tokens").delete().eq("client_id", appId);
        await sb.from("oauth_codes").delete().eq("client_id", appId);
        await sb.from("oauth_clients").delete().eq("id", appId);
        await send(BOT_TOKEN, chatId, msgId, "🗑 تم حذف التطبيق بنجاح.", [
          [{ text: "🔙 رجوع", callback_data: "oauth_list" }],
        ]);
        return new Response("OK");
      }

      if (d.startsWith("odel_")) {
        const appId = d.replace("odel_", "");
        await send(BOT_TOKEN, chatId, msgId, "⚠️ *هل أنت متأكد من حذف هذا التطبيق؟*\n\nسيتم حذف كل التوكنات المرتبطة.", [
          [{ text: "✅ نعم، احذف", callback_data: `odel_confirm_${appId}` }],
          [{ text: "🔙 إلغاء", callback_data: `oapp_${appId}` }],
        ]);
        return new Response("OK");
      }

      // ==================== معرض العرض (Showcase) ====================
      if (d === "showcase_menu") {
        await clearSession(sb, chatId);
        const { count } = await sb.from("showcase_items").select("*", { count: "exact", head: true });
        await send(BOT_TOKEN, chatId, msgId, `🎨 *معرض العرض (Showcase)*\n\nعناصر المعرض: *${count || 0}*\n\nإدارة المحتوى المعروض في صفحة الصور:`, [
          [{ text: "➕ إضافة عنصر جديد", callback_data: "sc_add" }],
          [{ text: "📋 عرض العناصر", callback_data: "sc_list_0" }],
          [{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }],
        ]);
        return new Response("OK");
      }

      if (d === "sc_add") {
        await saveSession(sb, chatId, { showcaseStep: "awaiting_media" });
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: "🎨 *إضافة عنصر جديد للمعرض*\n\n📤 الخطوة 1/6: أرسل صورة أو فيديو:",
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "showcase_menu" }]] }),
        });
        return new Response("OK");
      }

      // Showcase: select aspect ratio
      if (d.startsWith("sc_ar_")) {
        const ar = d.replace("sc_ar_", "");
        const session = await loadSession(sb, chatId);
        if (!session) return new Response("OK");
        session.showcaseAspect = ar;
        session.showcaseStep = "awaiting_quality";
        await saveSession(sb, chatId, session);
        await send(BOT_TOKEN, chatId, msgId, `📐 نسبة العرض: *${ar}*\n\n🎯 الخطوة 5/6: اختر الجودة:`, [
          ...SHOWCASE_QUALITIES.map(q => [{ text: q, callback_data: `sc_q_${q}` }]),
          [{ text: "❌ إلغاء", callback_data: "showcase_menu" }],
        ]);
        return new Response("OK");
      }

      // Showcase: select quality
      if (d.startsWith("sc_q_")) {
        const q = d.replace("sc_q_", "");
        const session = await loadSession(sb, chatId);
        if (!session) return new Response("OK");
        session.showcaseQuality = q;
        session.showcaseStep = "awaiting_duration";
        await saveSession(sb, chatId, session);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `✅ الجودة: *${q}*\n\n⏱ الخطوة 6/6: أدخل المدة (مثلاً: 8 sec) أو اكتب "skip" لتخطيها:`,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [
            [{ text: "⏭ تخطي (بدون مدة)", callback_data: "sc_skip_duration" }],
            [{ text: "❌ إلغاء", callback_data: "showcase_menu" }],
          ]}),
        });
        return new Response("OK");
      }

      // Showcase: skip duration
      if (d === "sc_skip_duration") {
        const session = await loadSession(sb, chatId);
        if (!session) return new Response("OK");
        await saveShowcaseItem(sb, BOT_TOKEN, chatId, session, null);
        return new Response("OK");
      }

      // Showcase: select model for showcase
      if (d.startsWith("sc_model_")) {
        const modelId = d.replace("sc_model_", "");
        const session = await loadSession(sb, chatId);
        if (!session) return new Response("OK");
        session.showcaseModelId = modelId;
        session.showcaseModelName = MODEL_NAMES[modelId] || modelId;
        session.showcaseStep = "awaiting_aspect";
        await saveSession(sb, chatId, session);
        await send(BOT_TOKEN, chatId, msgId, `✅ النموذج: *${session.showcaseModelName}*\n\n📐 الخطوة 4/6: اختر نسبة العرض:`, [
          ...SHOWCASE_ASPECTS.map(ar => [{ text: ar, callback_data: `sc_ar_${ar}` }]),
          [{ text: "❌ إلغاء", callback_data: "showcase_menu" }],
        ]);
        return new Response("OK");
      }

      // Showcase: model category
      if (d.startsWith("sc_cat_")) {
        const catKey = d.replace("sc_cat_", "");
        const dynCats2 = await getDynamicCategories(sb);
        const cat = dynCats2.find(c => c.key === catKey);
        if (!cat) return new Response("OK");
        const rows: { text: string; callback_data: string }[][] = [];
        for (let i = 0; i < cat.models.length; i += 2) {
          const row: { text: string; callback_data: string }[] = [];
          row.push({ text: MODEL_NAMES[cat.models[i]] || cat.models[i], callback_data: `sc_model_${cat.models[i]}` });
          if (cat.models[i + 1]) row.push({ text: MODEL_NAMES[cat.models[i + 1]] || cat.models[i + 1], callback_data: `sc_model_${cat.models[i + 1]}` });
          rows.push(row);
        }
        rows.push([{ text: "🔙 رجوع", callback_data: "sc_add" }]);
        await send(BOT_TOKEN, chatId, msgId, `🎯 اختر النموذج من *${cat.label}*:`, rows);
        return new Response("OK");
      }

      // Showcase: list items
      if (d.startsWith("sc_list_")) {
        const page = parseInt(d.replace("sc_list_", "")) || 0;
        const perPage = 5;
        const { data: items, count } = await sb.from("showcase_items")
          .select("*", { count: "exact" })
          .order("display_order", { ascending: true })
          .range(page * perPage, (page + 1) * perPage - 1);

        if (!items || items.length === 0) {
          await send(BOT_TOKEN, chatId, msgId, "📋 لا توجد عناصر في المعرض.", [
            [{ text: "➕ إضافة عنصر", callback_data: "sc_add" }],
            [{ text: "🔙 رجوع", callback_data: "showcase_menu" }],
          ]);
          return new Response("OK");
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / perPage);
        const rows = items.map((item: any) => [{
          text: `${item.media_type === "video" ? "🎬" : "🖼"} ${(item.prompt || "بدون وصف").slice(0, 25)}${item.prompt?.length > 25 ? "…" : ""}`,
          callback_data: `sc_view_${item.id}`,
        }]);

        const nav: { text: string; callback_data: string }[] = [];
        if (page > 0) nav.push({ text: "◀️", callback_data: `sc_list_${page - 1}` });
        nav.push({ text: `${page + 1}/${totalPages}`, callback_data: "noop" });
        if (page < totalPages - 1) nav.push({ text: "▶️", callback_data: `sc_list_${page + 1}` });
        rows.push(nav);
        rows.push([{ text: "🔙 رجوع", callback_data: "showcase_menu" }]);
        await send(BOT_TOKEN, chatId, msgId, `📋 *عناصر المعرض* (${total})`, rows);
        return new Response("OK");
      }

      // Showcase: view single item
      if (d.startsWith("sc_view_")) {
        const itemId = d.replace("sc_view_", "");
        const { data: item } = await sb.from("showcase_items").select("*").eq("id", itemId).single();
        if (!item) { await send(BOT_TOKEN, chatId, msgId, "❌ العنصر غير موجود", [[{ text: "🔙 رجوع", callback_data: "sc_list_0" }]]); return new Response("OK"); }

        await send(BOT_TOKEN, chatId, msgId,
          `🎨 *عنصر المعرض*\n\n` +
          `📝 البرومبت: ${(item as any).prompt || "—"}\n` +
          `🤖 النموذج: *${(item as any).model_name || "—"}*\n` +
          `📐 النسبة: ${(item as any).aspect_ratio}\n` +
          `🎯 الجودة: ${(item as any).quality}\n` +
          `⏱ المدة: ${(item as any).duration || "—"}\n` +
          `📸 النوع: ${(item as any).media_type}\n` +
          `🔢 الترتيب: ${(item as any).display_order}`,
          [
            [{ text: "🗑 حذف", callback_data: `sc_del_${itemId}` }],
            [{ text: "🔙 رجوع", callback_data: "sc_list_0" }],
          ]
        );
        return new Response("OK");
      }

      // Showcase: delete item
      if (d.startsWith("sc_del_")) {
        const itemId = d.replace("sc_del_", "");
        await sb.from("showcase_items").delete().eq("id", itemId);
        await send(BOT_TOKEN, chatId, msgId, "🗑 تم حذف العنصر من المعرض.", [
          [{ text: "📋 عرض العناصر", callback_data: "sc_list_0" }],
          [{ text: "🔙 رجوع", callback_data: "showcase_menu" }],
        ]);
        return new Response("OK");
      }

      // ==================== إعدادات الصفحات ====================
      if (d === "pagesettings_menu") {
        await clearSession(sb, chatId);
        await send(BOT_TOKEN, chatId, msgId, "⚙️ *إعدادات الصفحات*\n\nإدارة الخيارات المتاحة في صفحات التطبيق:", [
          [{ text: "🖼 إعدادات الصور", callback_data: "ps_images" }],
          [{ text: "🎬 إعدادات الفيديو", callback_data: "ps_videos" }],
          [{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }],
        ]);
        return new Response("OK");
      }

      // ---- Image page settings ----
      if (d === "ps_images") {
        const s = await getPageSettings(sb, "images") as typeof DEFAULT_PAGE_IMAGES;
        await send(BOT_TOKEN, chatId, msgId,
          `🖼 *إعدادات صفحة الصور*\n\n` +
          `📐 النسب: \`${s.aspectRatios.join(", ")}\`\n` +
          `🔢 أقصى عدد صور: \`${s.maxImages}\`\n` +
          `📐 النسبة الافتراضية: \`${s.defaultAspect}\`\n` +
          `🔢 العدد الافتراضي: \`${s.defaultNumImages}\``,
          [
            [{ text: "📐 تعديل النسب", callback_data: "ps_img_aspects" }],
            [{ text: "🔢 أقصى عدد صور", callback_data: "ps_img_max" }],
            [{ text: "📐 النسبة الافتراضية", callback_data: "ps_img_defaspect" }],
            [{ text: "🔢 العدد الافتراضي", callback_data: "ps_img_defnum" }],
            [{ text: "🗑 إعادة ضبط", callback_data: "ps_img_reset" }],
            [{ text: "🔙 رجوع", callback_data: "pagesettings_menu" }],
          ]
        );
        return new Response("OK");
      }

      if (d === "ps_img_styles") {
        await saveSession(sb, chatId, { adminAction: "ps_img_styles" });
        await send(BOT_TOKEN, chatId, msgId,
          "🎨 *تعديل الأنماط*\n\nأدخل الأنماط مفصولة بفواصل:\n\n" +
          "الأنماط المتاحة:\n`none, dynamic, cinematic, creative, fashion, portrait, stock-photo, vibrant, anime, 3d-render`",
          [[{ text: "🔙 إلغاء", callback_data: "ps_images" }]]
        );
        return new Response("OK");
      }

      if (d === "ps_img_aspects") {
        await saveSession(sb, chatId, { adminAction: "ps_img_aspects" });
        await send(BOT_TOKEN, chatId, msgId,
          "📐 *تعديل نسب العرض*\n\nأدخل النسب مفصولة بفواصل:\n\nمثال: `2:3, 1:1, 16:9, 4:3, 9:16`",
          [[{ text: "🔙 إلغاء", callback_data: "ps_images" }]]
        );
        return new Response("OK");
      }

      if (d === "ps_img_max") {
        await saveSession(sb, chatId, { adminAction: "ps_img_max" });
        await send(BOT_TOKEN, chatId, msgId, "🔢 *أقصى عدد صور*\n\nاختر العدد:", [
          [{ text: "1", callback_data: "psv_img_max_1" }, { text: "2", callback_data: "psv_img_max_2" }],
          [{ text: "4", callback_data: "psv_img_max_4" }, { text: "8", callback_data: "psv_img_max_8" }],
          [{ text: "🔙 إلغاء", callback_data: "ps_images" }],
        ]);
        return new Response("OK");
      }

      if (d === "ps_img_defstyle") {
        const s = await getPageSettings(sb, "images") as typeof DEFAULT_PAGE_IMAGES;
        const rows: { text: string; callback_data: string }[][] = [];
        for (let i = 0; i < s.styles.length; i += 3) {
          const row: { text: string; callback_data: string }[] = [];
          for (let j = i; j < Math.min(i + 3, s.styles.length); j++) {
            const st = s.styles[j];
            row.push({ text: `${st === s.defaultStyle ? "✅ " : ""}${st}`, callback_data: `psv_img_defstyle_${st}` });
          }
          rows.push(row);
        }
        rows.push([{ text: "🔙 إلغاء", callback_data: "ps_images" }]);
        await send(BOT_TOKEN, chatId, msgId, "✨ *اختر النمط الافتراضي:*", rows);
        return new Response("OK");
      }

      if (d === "ps_img_defaspect") {
        const s = await getPageSettings(sb, "images") as typeof DEFAULT_PAGE_IMAGES;
        const rows = s.aspectRatios.map(ar => [{
          text: `${ar === s.defaultAspect ? "✅ " : ""}${ar}`,
          callback_data: `psv_img_defaspect_${ar}`,
        }]);
        rows.push([{ text: "🔙 إلغاء", callback_data: "ps_images" }]);
        await send(BOT_TOKEN, chatId, msgId, "📐 *اختر النسبة الافتراضية:*", rows);
        return new Response("OK");
      }

      if (d === "ps_img_defnum") {
        await send(BOT_TOKEN, chatId, msgId, "🔢 *اختر العدد الافتراضي للصور:*", [
          [{ text: "1", callback_data: "psv_img_defnum_1" }, { text: "2", callback_data: "psv_img_defnum_2" }],
          [{ text: "3", callback_data: "psv_img_defnum_3" }, { text: "4", callback_data: "psv_img_defnum_4" }],
          [{ text: "🔙 إلغاء", callback_data: "ps_images" }],
        ]);
        return new Response("OK");
      }

      if (d === "ps_img_reset") {
        await sb.from("memories").delete().eq("key", "page_settings_images");
        await send(BOT_TOKEN, chatId, msgId, "🗑 تم إعادة ضبط إعدادات الصور.", [
          [{ text: "🔙 رجوع", callback_data: "ps_images" }],
        ]);
        return new Response("OK");
      }

      // Handle image settings quick values
      if (d.startsWith("psv_img_")) {
        const rest = d.replace("psv_img_", "");
        const idx = rest.indexOf("_");
        const field = rest.slice(0, idx);
        const value = rest.slice(idx + 1);
        const s = await getPageSettings(sb, "images") as typeof DEFAULT_PAGE_IMAGES;

        if (field === "max") (s as any).maxImages = parseInt(value);
        else if (field === "defstyle") (s as any).defaultStyle = value;
        else if (field === "defaspect") (s as any).defaultAspect = value;
        else if (field === "defnum") (s as any).defaultNumImages = parseInt(value);

        await savePageSettings(sb, "images", s);
        await send(BOT_TOKEN, chatId, msgId, `✅ تم التحديث!`, [
          [{ text: "🖼 إعدادات الصور", callback_data: "ps_images" }],
          [{ text: "🔙 القائمة", callback_data: "pagesettings_menu" }],
        ]);
        return new Response("OK");
      }

      // ---- Video page settings ----
      if (d === "ps_videos") {
        const s = await getPageSettings(sb, "videos") as typeof DEFAULT_PAGE_VIDEOS;
        await send(BOT_TOKEN, chatId, msgId,
          `🎬 *إعدادات صفحة الفيديو*\n\n` +
          `📐 النسب: \`${s.aspectRatios.join(", ")}\`\n` +
          `⏱ المدد: \`${s.durations.join(", ")}s\`\n` +
          `📺 الدقات: \`${s.resolutions.join(", ")}\`\n` +
          `📐 النسبة الافتراضية: \`${s.defaultAspect}\`\n` +
          `⏱ المدة الافتراضية: \`${s.defaultDuration}s\`\n` +
          `📺 الدقة الافتراضية: \`${s.defaultResolution}\``,
          [
            [{ text: "📐 تعديل النسب", callback_data: "ps_vid_aspects" }],
            [{ text: "⏱ تعديل المدد", callback_data: "ps_vid_durations" }],
            [{ text: "📺 تعديل الدقات", callback_data: "ps_vid_resolutions" }],
            [{ text: "📐 النسبة الافتراضية", callback_data: "ps_vid_defaspect" }],
            [{ text: "⏱ المدة الافتراضية", callback_data: "ps_vid_defdur" }],
            [{ text: "📺 الدقة الافتراضية", callback_data: "ps_vid_defres" }],
            [{ text: "🗑 إعادة ضبط", callback_data: "ps_vid_reset" }],
            [{ text: "🔙 رجوع", callback_data: "pagesettings_menu" }],
          ]
        );
        return new Response("OK");
      }

      if (d === "ps_vid_aspects") {
        await saveSession(sb, chatId, { adminAction: "ps_vid_aspects" });
        await send(BOT_TOKEN, chatId, msgId,
          "📐 *تعديل نسب العرض للفيديو*\n\nأدخل النسب مفصولة بفواصل:\n\nمثال: `9:16, 16:9, 1:1, 4:3`",
          [[{ text: "🔙 إلغاء", callback_data: "ps_videos" }]]
        );
        return new Response("OK");
      }

      if (d === "ps_vid_durations") {
        await saveSession(sb, chatId, { adminAction: "ps_vid_durations" });
        await send(BOT_TOKEN, chatId, msgId,
          "⏱ *تعديل المدد المتاحة*\n\nأدخل المدد بالثواني مفصولة بفواصل:\n\nمثال: `4, 5, 6, 8, 10`",
          [[{ text: "🔙 إلغاء", callback_data: "ps_videos" }]]
        );
        return new Response("OK");
      }

      if (d === "ps_vid_resolutions") {
        await saveSession(sb, chatId, { adminAction: "ps_vid_resolutions" });
        await send(BOT_TOKEN, chatId, msgId,
          "📺 *تعديل الدقات المتاحة*\n\nأدخل الدقات مفصولة بفواصل:\n\nمثال: `720p, 1080p, 2K, 4K`",
          [[{ text: "🔙 إلغاء", callback_data: "ps_videos" }]]
        );
        return new Response("OK");
      }

      if (d === "ps_vid_defaspect") {
        const s = await getPageSettings(sb, "videos") as typeof DEFAULT_PAGE_VIDEOS;
        const rows = s.aspectRatios.map(ar => [{
          text: `${ar === s.defaultAspect ? "✅ " : ""}${ar}`,
          callback_data: `psv_vid_defaspect_${ar}`,
        }]);
        rows.push([{ text: "🔙 إلغاء", callback_data: "ps_videos" }]);
        await send(BOT_TOKEN, chatId, msgId, "📐 *اختر النسبة الافتراضية:*", rows);
        return new Response("OK");
      }

      if (d === "ps_vid_defdur") {
        const s = await getPageSettings(sb, "videos") as typeof DEFAULT_PAGE_VIDEOS;
        const rows = [s.durations.map(dur => ({
          text: `${dur === s.defaultDuration ? "✅ " : ""}${dur}s`,
          callback_data: `psv_vid_defdur_${dur}`,
        }))];
        rows.push([{ text: "🔙 إلغاء", callback_data: "ps_videos" }]);
        await send(BOT_TOKEN, chatId, msgId, "⏱ *اختر المدة الافتراضية:*", rows);
        return new Response("OK");
      }

      if (d === "ps_vid_defres") {
        const s = await getPageSettings(sb, "videos") as typeof DEFAULT_PAGE_VIDEOS;
        const rows = [s.resolutions.map(res => ({
          text: `${res === s.defaultResolution ? "✅ " : ""}${res}`,
          callback_data: `psv_vid_defres_${res}`,
        }))];
        rows.push([{ text: "🔙 إلغاء", callback_data: "ps_videos" }]);
        await send(BOT_TOKEN, chatId, msgId, "📺 *اختر الدقة الافتراضية:*", rows);
        return new Response("OK");
      }

      if (d === "ps_vid_reset") {
        await sb.from("memories").delete().eq("key", "page_settings_videos");
        await send(BOT_TOKEN, chatId, msgId, "🗑 تم إعادة ضبط إعدادات الفيديو.", [
          [{ text: "🔙 رجوع", callback_data: "ps_videos" }],
        ]);
        return new Response("OK");
      }

      // Handle video settings quick values
      if (d.startsWith("psv_vid_")) {
        const rest = d.replace("psv_vid_", "");
        const idx = rest.indexOf("_");
        const field = rest.slice(0, idx);
        const value = rest.slice(idx + 1);
        const s = await getPageSettings(sb, "videos") as typeof DEFAULT_PAGE_VIDEOS;

        if (field === "defaspect") (s as any).defaultAspect = value;
        else if (field === "defdur") (s as any).defaultDuration = parseInt(value);
        else if (field === "defres") (s as any).defaultResolution = value;

        await savePageSettings(sb, "videos", s);
        await send(BOT_TOKEN, chatId, msgId, `✅ تم التحديث!`, [
          [{ text: "🎬 إعدادات الفيديو", callback_data: "ps_videos" }],
          [{ text: "🔙 القائمة", callback_data: "pagesettings_menu" }],
        ]);
        return new Response("OK");
      }

      // ==================== التخصيص (Customization) ====================
      if (d === "cust") {
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        try { cust = JSON.parse(config.customization || "{}"); } catch {}
        const rows = CUST_FEATURES.map(f => [{
          text: `${cust[f.key]?.on ? "✅" : "⬜"} ${f.emoji} ${f.label}`,
          callback_data: `ct_${f.key}`,
        }, {
          text: cust[f.key]?.on ? "⚙️" : "—",
          callback_data: cust[f.key]?.on ? `co_${f.key}` : "noop",
        }]);
        rows.push([{ text: "💾 تم", callback_data: `emod_${session.adminModelId}` }]);
        await send(BOT_TOKEN, chatId, msgId, `🎛 *التخصيص* لـ \`${session.adminModelId}\`\n\nاختر الخاصية لتفعيلها/تعطيلها:\n(⚙️ = تعديل الخيارات)`, rows);
        return new Response("OK");
      }

      // Toggle customization feature
      if (d.startsWith("ct_")) {
        const feat = d.replace("ct_", "");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        try { cust = JSON.parse(config.customization || "{}"); } catch {}
        if (!cust[feat]) cust[feat] = { on: false };
        cust[feat].on = !cust[feat].on;
        if (cust[feat].on && CUST_OPTIONS[feat]) {
          if (!cust[feat].opts) cust[feat].opts = [...CUST_OPTIONS[feat]];
          if (!cust[feat].prices) cust[feat].prices = {};
          if (!cust[feat].def) cust[feat].def = CUST_OPTIONS[feat][0];
        }
        if (cust[feat].on && feat === "neg" && cust[feat].price === undefined) cust[feat].price = 0;
        if (cust[feat].on && feat === "ni") {
          if (!cust[feat].max) cust[feat].max = 4;
          if (cust[feat].pp === undefined) cust[feat].pp = 1;
        }
        config.customization = JSON.stringify(cust);
        await setModelConfig(sb, session.adminModelId, config);
        const rows = CUST_FEATURES.map(f => [{
          text: `${cust[f.key]?.on ? "✅" : "⬜"} ${f.emoji} ${f.label}`,
          callback_data: `ct_${f.key}`,
        }, {
          text: cust[f.key]?.on ? "⚙️" : "—",
          callback_data: cust[f.key]?.on ? `co_${f.key}` : "noop",
        }]);
        rows.push([{ text: "💾 تم", callback_data: `emod_${session.adminModelId}` }]);
        await send(BOT_TOKEN, chatId, msgId, `🎛 *التخصيص*\n\n${CUST_FEATURES.find(f=>f.key===feat)?.emoji||""} ${feat}: ${cust[feat].on ? "✅ مفعّل" : "⬜ معطّل"}`, rows);
        return new Response("OK");
      }

      // Edit feature options
      if (d.startsWith("co_")) {
        const feat = d.replace("co_", "");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        try { cust = JSON.parse(config.customization || "{}"); } catch {}
        const fc = cust[feat] || {};

        if (feat === "neg") {
          const priceRows: any[][] = [];
          for (let i = 0; i < CUST_PRICES.length; i += 5) {
            const row: any[] = [];
            for (let j = i; j < Math.min(i + 5, CUST_PRICES.length); j++) {
              const p = CUST_PRICES[j];
              row.push({ text: `${p === (fc.price || 0) ? "✅ " : ""}${p >= 0 ? "+" : ""}${p}`, callback_data: `cpn_${p}` });
            }
            priceRows.push(row);
          }
          priceRows.push([{ text: "🔙 رجوع", callback_data: "cust" }]);
          await send(BOT_TOKEN, chatId, msgId, `🚫 *Negative Prompt*\n\nسعر إضافي: ${fc.price || 0} MC`, priceRows);
          return new Response("OK");
        }

        if (feat === "ni") {
          const niOpts = CUST_OPTIONS.ni || [];
          const maxRows: any[][] = [];
          for (let i = 0; i < niOpts.length; i += 3) {
            const row: any[] = [];
            for (let j = i; j < Math.min(i + 3, niOpts.length); j++) {
              row.push({ text: `${String(fc.max) === niOpts[j] ? "✅ " : ""}${niOpts[j]}`, callback_data: `cnm_${niOpts[j]}` });
            }
            maxRows.push(row);
          }
          const ppRows: any[][] = [];
          const ppPrices = CUST_PRICES.filter(p => p >= 0);
          for (let i = 0; i < ppPrices.length; i += 4) {
            const row: any[] = [];
            for (let j = i; j < Math.min(i + 4, ppPrices.length); j++) {
              row.push({ text: `${ppPrices[j] === (fc.pp || 1) ? "✅ " : ""}${ppPrices[j]}`, callback_data: `cnp_${ppPrices[j]}` });
            }
            ppRows.push(row);
          }
          await send(BOT_TOKEN, chatId, msgId, `🔢 *عدد الصور*\n\nالحد الأقصى: ${fc.max || 4}\nسعر كل صورة إضافية: ${fc.pp || 1} MC`, [
            [{ text: "— الحد الأقصى —", callback_data: "noop" }],
            ...maxRows,
            [{ text: "— سعر الصورة الإضافية —", callback_data: "noop" }],
            ...ppRows,
            [{ text: "🔙 رجوع", callback_data: "cust" }],
          ]);
          return new Response("OK");
        }

        // ar, q, dur, res: options toggle
        const allOpts = CUST_OPTIONS[feat] || [];
        const selected = fc.opts || [];
        const prices = fc.prices || {};
        const featInfo = CUST_FEATURES.find(f => f.key === feat);
        const rows: any[][] = [];
        for (let i = 0; i < allOpts.length; i += 3) {
          const row: any[] = [];
          for (let j = i; j < Math.min(i + 3, allOpts.length); j++) {
            const o = allOpts[j];
            const isOn = selected.includes(o);
            const pr = prices[o] || 0;
            row.push({ text: `${isOn ? "✅" : "⬜"} ${o}${pr ? ` (${pr > 0 ? "+" : ""}${pr})` : ""}`, callback_data: `cop_${feat}_${o}` });
          }
          rows.push(row);
        }
        if (fc.def) rows.push([{ text: `📌 الافتراضي: ${fc.def}`, callback_data: `cdf_${feat}` }]);
        rows.push([{ text: "💰 تعديل الأسعار", callback_data: `cpr_${feat}` }]);
        rows.push([{ text: "🔙 رجوع", callback_data: "cust" }]);
        await send(BOT_TOKEN, chatId, msgId, `${featInfo?.emoji||""} *${featInfo?.label||feat}*\n\nاضغط لتفعيل/تعطيل الخيارات:`, rows);
        return new Response("OK");
      }

      // Toggle option within feature
      if (d.startsWith("cop_")) {
        const rest = d.replace("cop_", "");
        const us = rest.indexOf("_");
        const feat = rest.slice(0, us);
        const opt = rest.slice(us + 1);
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        try { cust = JSON.parse(config.customization || "{}"); } catch {}
        if (!cust[feat]) cust[feat] = { on: true, opts: [], prices: {} };
        const opts: string[] = cust[feat].opts || [];
        const idx = opts.indexOf(opt);
        if (idx >= 0) opts.splice(idx, 1); else opts.push(opt);
        cust[feat].opts = opts;
        config.customization = JSON.stringify(cust);
        await setModelConfig(sb, session.adminModelId, config);
        // Re-render by simulating co_ press
        const allOpts = CUST_OPTIONS[feat] || [];
        const prices = cust[feat].prices || {};
        const featInfo = CUST_FEATURES.find(f => f.key === feat);
        const rows: any[][] = [];
        for (let i = 0; i < allOpts.length; i += 3) {
          const row: any[] = [];
          for (let j = i; j < Math.min(i + 3, allOpts.length); j++) {
            const o = allOpts[j];
            const isOn = opts.includes(o);
            const pr = prices[o] || 0;
            row.push({ text: `${isOn ? "✅" : "⬜"} ${o}${pr ? ` (${pr > 0 ? "+" : ""}${pr})` : ""}`, callback_data: `cop_${feat}_${o}` });
          }
          rows.push(row);
        }
        if (cust[feat].def) rows.push([{ text: `📌 الافتراضي: ${cust[feat].def}`, callback_data: `cdf_${feat}` }]);
        rows.push([{ text: "💰 تعديل الأسعار", callback_data: `cpr_${feat}` }]);
        rows.push([{ text: "🔙 رجوع", callback_data: "cust" }]);
        await send(BOT_TOKEN, chatId, msgId, `${featInfo?.emoji||""} *${featInfo?.label||feat}*\n\n${opt}: ${opts.includes(opt) ? "✅" : "⬜"}`, rows);
        return new Response("OK");
      }

      // Set default for feature
      if (d.startsWith("cdf_")) {
        const feat = d.replace("cdf_", "");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        try { cust = JSON.parse(config.customization || "{}"); } catch {}
        const opts = cust[feat]?.opts || [];
        const rows = opts.map((o: string) => [{ text: `${o === cust[feat]?.def ? "✅ " : ""}${o}`, callback_data: `cdv_${feat}_${o}` }]);
        rows.push([{ text: "🔙 رجوع", callback_data: `co_${feat}` }]);
        await send(BOT_TOKEN, chatId, msgId, `📌 *اختر القيمة الافتراضية:*`, rows);
        return new Response("OK");
      }

      if (d.startsWith("cdv_")) {
        const rest = d.replace("cdv_", "");
        const us = rest.indexOf("_");
        const feat = rest.slice(0, us);
        const val = rest.slice(us + 1);
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        try { cust = JSON.parse(config.customization || "{}"); } catch {}
        if (!cust[feat]) cust[feat] = { on: true };
        cust[feat].def = val;
        config.customization = JSON.stringify(cust);
        await setModelConfig(sb, session.adminModelId, config);
        await send(BOT_TOKEN, chatId, msgId, `✅ الافتراضي: ${val}`, [[{ text: "🔙 رجوع", callback_data: `co_${feat}` }]]);
        return new Response("OK");
      }

      // Price list for feature
      if (d.startsWith("cpr_")) {
        const feat = d.replace("cpr_", "");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        try { cust = JSON.parse(config.customization || "{}"); } catch {}
        const opts = cust[feat]?.opts || [];
        const prices = cust[feat]?.prices || {};
        const rows = opts.map((o: string) => [{ text: `${o}: ${prices[o] !== undefined ? (prices[o] >= 0 ? "+" : "") + prices[o] : "0"} MC`, callback_data: `cpo_${feat}_${o}` }]);
        rows.push([{ text: "🔙 رجوع", callback_data: `co_${feat}` }]);
        await send(BOT_TOKEN, chatId, msgId, `💰 *أسعار ${CUST_FEATURES.find(f=>f.key===feat)?.label||feat}*\n\nاضغط لتعديل السعر:`, rows);
        return new Response("OK");
      }

      // Price picker for option
      if (d.startsWith("cpo_")) {
        const rest = d.replace("cpo_", "");
        const us = rest.indexOf("_");
        const feat = rest.slice(0, us);
        const opt = rest.slice(us + 1);
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        try { cust = JSON.parse(config.customization || "{}"); } catch {}
        const currentPrice = cust[feat]?.prices?.[opt] || 0;
        const rows: any[][] = [];
        for (let i = 0; i < CUST_PRICES.length; i += 5) {
          const row: any[] = [];
          for (let j = i; j < Math.min(i + 5, CUST_PRICES.length); j++) {
            const p = CUST_PRICES[j];
            row.push({ text: `${p === currentPrice ? "✅ " : ""}${p >= 0 ? "+" : ""}${p}`, callback_data: `cpx_${feat}_${opt}_${p}` });
          }
          rows.push(row);
        }
        rows.push([{ text: "🔙 رجوع", callback_data: `cpr_${feat}` }]);
        await send(BOT_TOKEN, chatId, msgId, `💰 سعر *${opt}* (MC إضافي):`, rows);
        return new Response("OK");
      }

      // Set price value
      if (d.startsWith("cpx_")) {
        const parts = d.replace("cpx_", "").split("_");
        const feat = parts[0];
        const price = parseInt(parts[parts.length - 1]);
        const opt = parts.slice(1, -1).join("_");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        try { cust = JSON.parse(config.customization || "{}"); } catch {}
        if (!cust[feat]) cust[feat] = { on: true, opts: [], prices: {} };
        if (!cust[feat].prices) cust[feat].prices = {};
        cust[feat].prices[opt] = price;
        config.customization = JSON.stringify(cust);
        await setModelConfig(sb, session.adminModelId, config);
        await send(BOT_TOKEN, chatId, msgId, `✅ ${opt}: ${price >= 0 ? "+" : ""}${price} MC`, [
          [{ text: "🔙 الأسعار", callback_data: `cpr_${feat}` }],
          [{ text: "🔙 التخصيص", callback_data: "cust" }],
        ]);
        return new Response("OK");
      }

      // Negative prompt price
      if (d.startsWith("cpn_")) {
        const price = parseInt(d.replace("cpn_", ""));
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        try { cust = JSON.parse(config.customization || "{}"); } catch {}
        if (!cust.neg) cust.neg = { on: true };
        cust.neg.price = price;
        config.customization = JSON.stringify(cust);
        await setModelConfig(sb, session.adminModelId, config);
        await send(BOT_TOKEN, chatId, msgId, `✅ Negative Prompt: ${price >= 0 ? "+" : ""}${price} MC`, [[{ text: "🔙 التخصيص", callback_data: "cust" }]]);
        return new Response("OK");
      }

      // Number of images max
      if (d.startsWith("cnm_")) {
        const max = parseInt(d.replace("cnm_", ""));
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        try { cust = JSON.parse(config.customization || "{}"); } catch {}
        if (!cust.ni) cust.ni = { on: true };
        cust.ni.max = max;
        config.customization = JSON.stringify(cust);
        await setModelConfig(sb, session.adminModelId, config);
        await send(BOT_TOKEN, chatId, msgId, `✅ الحد الأقصى: ${max}`, [[{ text: "🔙 رجوع", callback_data: `co_ni` }], [{ text: "🔙 التخصيص", callback_data: "cust" }]]);
        return new Response("OK");
      }

      // Number of images price per extra
      if (d.startsWith("cnp_")) {
        const pp = parseInt(d.replace("cnp_", ""));
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        let cust: Record<string, any> = {};
        try { cust = JSON.parse(config.customization || "{}"); } catch {}
        if (!cust.ni) cust.ni = { on: true };
        cust.ni.pp = pp;
        config.customization = JSON.stringify(cust);
        await setModelConfig(sb, session.adminModelId, config);
        await send(BOT_TOKEN, chatId, msgId, `✅ سعر الصورة الإضافية: ${pp} MC`, [[{ text: "🔙 رجوع", callback_data: `co_ni` }], [{ text: "🔙 التخصيص", callback_data: "cust" }]]);
        return new Response("OK");
      }

      // ==================== الشارات (Badges) ====================
      if (d === "bdg") {
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        const current = (config.badges || "").split(",").filter(Boolean);
        const rows: any[][] = [];
        for (let i = 0; i < BADGE_OPTIONS.length; i += 3) {
          const row: any[] = [];
          for (let j = i; j < Math.min(i + 3, BADGE_OPTIONS.length); j++) {
            const b = BADGE_OPTIONS[j];
            row.push({ text: `${current.includes(b) ? "✅" : "⬜"} ${b}`, callback_data: `bt_${b}` });
          }
          rows.push(row);
        }
        rows.push([{ text: "💾 حفظ", callback_data: `emod_${session.adminModelId}` }]);
        await send(BOT_TOKEN, chatId, msgId, `🏷 *الشارات* لـ \`${session.adminModelId}\`\n\nالمحدد: ${current.length > 0 ? current.join(", ") : "لا شيء"}`, rows);
        return new Response("OK");
      }

      if (d.startsWith("bt_")) {
        const badge = d.replace("bt_", "");
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        const config = await getModelConfig(sb, session.adminModelId);
        const current = (config.badges || "").split(",").filter(Boolean);
        const idx = current.indexOf(badge);
        if (idx >= 0) current.splice(idx, 1); else current.push(badge);
        config.badges = current.join(",");
        await setModelConfig(sb, session.adminModelId, config);
        const rows: any[][] = [];
        for (let i = 0; i < BADGE_OPTIONS.length; i += 3) {
          const row: any[] = [];
          for (let j = i; j < Math.min(i + 3, BADGE_OPTIONS.length); j++) {
            const b = BADGE_OPTIONS[j];
            row.push({ text: `${current.includes(b) ? "✅" : "⬜"} ${b}`, callback_data: `bt_${b}` });
          }
          rows.push(row);
        }
        rows.push([{ text: "💾 حفظ", callback_data: `emod_${session.adminModelId}` }]);
        await send(BOT_TOKEN, chatId, msgId, `🏷 *الشارات*\n\nالمحدد: ${current.length > 0 ? current.join(", ") : "لا شيء"}`, rows);
        return new Response("OK");
      }

      // ==================== رفع الأيقونة (callback) ====================
      if (d === "icn_up") {
        const session = await loadSession(sb, chatId);
        if (!session?.adminModelId) return new Response("OK");
        await saveSession(sb, chatId, { ...session, adminAction: "awaiting_icon" });
        await send(BOT_TOKEN, chatId, msgId, `📷 *رفع أيقونة النموذج*\n\nأرسل صورة (PNG/SVG/JPG) لـ \`${session.adminModelId}\`:`, [[{ text: "🔙 إلغاء", callback_data: `emod_${session.adminModelId}` }]]);
        return new Response("OK");
      }

      // ==================== الإحصائيات ====================
      if (d === "stats") {
        const { count: userCount } = await sb.from("profiles").select("*", { count: "exact", head: true });
        const { count: convCount } = await sb.from("conversations").select("*", { count: "exact", head: true });
        const { count: msgCount } = await sb.from("messages").select("*", { count: "exact", head: true });
        const { count: projectCount } = await sb.from("projects").select("*", { count: "exact", head: true });
        const { count: oauthCount } = await sb.from("oauth_clients").select("*", { count: "exact", head: true });
        const { count: showcaseCount } = await sb.from("showcase_items").select("*", { count: "exact", head: true });
        const imgMedia = await getExistingMedia(sb, IMAGE_MODELS);
        const vidMedia = await getExistingMedia(sb, VIDEO_MODELS);

        await send(BOT_TOKEN, chatId, msgId,
          `📊 *إحصائيات النظام*\n\n` +
          `👥 المستخدمين: *${userCount || 0}*\n` +
          `💬 المحادثات: *${convCount || 0}*\n` +
          `📝 الرسائل: *${msgCount || 0}*\n` +
          `💻 المشاريع: *${projectCount || 0}*\n` +
          `🔑 OAuth Apps: *${oauthCount || 0}*\n` +
          `🎨 Showcase: *${showcaseCount || 0}*\n` +
          `🖼 وسائط الصور: *${imgMedia.size}/${IMAGE_MODELS.length}*\n` +
          `🎬 وسائط الفيديو: *${vidMedia.size}/${VIDEO_MODELS.length}*`,
          [[{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }]]
        );
        return new Response("OK");
      }

      return new Response("OK");
    }

    // ==================== رسائل نصية / وسائط ====================
    if (message) {
      const chatId = message.chat.id;
      const text = message.text as string | undefined;

      if (text === "/start") {
        await clearSession(sb, chatId);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: "🤖 *لوحة تحكم Megsy*\n\nمرحباً! اختر عملية:",
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: mainMenuKB() }),
        });
        return new Response("OK");
      }

      // /1 command - add admin
      if (text === "/1") {
        await saveSession(sb, chatId, { adminAction: "awaiting_admin_id" } as any);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: "👤 *إضافة أدمن جديد*\n\nأرسل Telegram Chat ID للأدمن الجديد:",
          parse_mode: "Markdown",
        });
        return new Response("OK");
      }

      const session = await loadSession(sb, chatId);

      // Handle admin ID input
      if ((session as any)?.adminAction === "awaiting_admin_id" && text) {
        const adminChatId = parseInt(text.trim());
        if (isNaN(adminChatId)) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "❌ أدخل رقم صحيح (Chat ID)" });
          return new Response("OK");
        }
        const { error } = await sb.from("bot_admins").upsert({ telegram_chat_id: adminChatId, added_by: chatId }, { onConflict: "telegram_chat_id" });
        await clearSession(sb, chatId);
        if (error) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `❌ خطأ: ${error.message}` });
        } else {
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId,
            text: `✅ تم إضافة الأدمن بنجاح!\nChat ID: \`${adminChatId}\``,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }]] }),
          });
        }
        return new Response("OK");
      }

      // Handle LemonData key input
      if ((session as any)?.adminAction === "lemon_awaiting_key" && text) {
        const keys = text.trim().split("\n").map((k: string) => k.trim()).filter((k: string) => k.length > 10);
        if (keys.length === 0) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "❌ لم يتم العثور على مفاتيح صالحة. أرسل مفتاح واحد على الأقل:" });
          return new Response("OK");
        }
        const rows = keys.map((k: string) => ({ api_key: k, label: `Added ${new Date().toLocaleDateString()}` }));
        const { error } = await sb.from("lemondata_keys").insert(rows);
        // DON'T clear session - keep accepting more keys
        if (error) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `❌ خطأ: ${error.message}` });
        } else {
          const { count } = await sb.from("lemondata_keys").select("id", { count: "exact", head: true }).eq("is_active", true).eq("is_blocked", false);
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId,
            text: `✅ تم إضافة *${keys.length}* مفتاح بنجاح!\n\n📊 إجمالي المفاتيح النشطة: *${count || 0}*\n\n📩 أرسل المزيد من المفاتيح أو اضغط "لقد انتهيت"`,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [
              [{ text: "✅ لقد انتهيت", callback_data: "lemon_done_adding" }],
            ] }),
          });
        }
        return new Response("OK");
      }

      // ---- API Keys text input handler ----
      if ((session as any)?.adminAction?.startsWith("ak_awaiting_key_") && text) {
        const service = (session as any).adminAction.replace("ak_awaiting_key_", "");
        const keys = text.trim().split("\n").map((k: string) => k.trim()).filter((k: string) => k.length > 10);
        if (keys.length === 0) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "❌ لم يتم العثور على مفاتيح صالحة." });
          return new Response("OK");
        }
        const rows = keys.map((k: string) => ({ service, api_key: k, label: `Added ${new Date().toLocaleDateString()}` }));
        const { error } = await sb.from("api_keys").insert(rows);
        if (error) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `❌ خطأ: ${error.message}` });
        } else {
          const { count } = await sb.from("api_keys").select("id", { count: "exact", head: true }).eq("service", service).eq("is_active", true).eq("is_blocked", false);
          await clearSession(sb, chatId);
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId,
            text: `✅ تم إضافة *${keys.length}* مفتاح ${service} بنجاح!\n\n📊 إجمالي النشطة: *${count || 0}*`,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 رجوع", callback_data: `ak_svc_${service}` }]] }),
          });
        }
        return new Response("OK");
      }

      // Voice template text handlers
      if ((session as any)?.adminAction === "vt_awaiting_name" && text) {
        (session as any).vtName = text.trim();
        (session as any).adminAction = "vt_awaiting_audio";
        await saveSession(sb, chatId, session as any);
        await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `✅ الاسم: *${text.trim()}*\n\nأرسل ملف الصوت (audio) للقالب:`, parse_mode: "Markdown", reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "voice_templates_menu" }]] }) });
        return new Response("OK");
      }

      if ((session as any)?.adminAction === "vt_awaiting_audio") {
        let fileId: string | null = null;
        if (message.audio) fileId = message.audio.file_id;
        else if (message.voice) fileId = message.voice.file_id;
        else if (message.document?.mime_type?.startsWith("audio/")) fileId = message.document.file_id;
        if (!fileId) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "أرسل ملف صوتي فقط." }); return new Response("OK"); }
        const fileInfo = await tg(BOT_TOKEN, "getFile", { file_id: fileId });
        const filePath = fileInfo.result?.file_path;
        if (!filePath) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "فشل." }); return new Response("OK"); }
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
        const fileResp = await fetch(fileUrl);
        const fileBuffer = await fileResp.arrayBuffer();
        const ext = filePath.split(".").pop() || "ogg";
        const storagePath = `voice-templates/${crypto.randomUUID()}.${ext}`;
        await sb.storage.from("model-media").upload(storagePath, fileBuffer, { contentType: `audio/${ext}`, upsert: true });
        const { data: urlData } = sb.storage.from("model-media").getPublicUrl(storagePath);
        await sb.from("voice_templates").insert({ name: (session as any).vtName || "Untitled", audio_file_url: urlData.publicUrl });
        await clearSession(sb, chatId);
        await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `✅ تم إضافة قالب *${(session as any).vtName}*`, parse_mode: "Markdown", reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "➕ آخر", callback_data: "vt_add" }], [{ text: "🔙", callback_data: "voice_templates_menu" }]] }) });
        return new Response("OK");
      }

      // TTS voice text handlers
      if ((session as any)?.adminAction === "tv_awaiting_name" && text) {
        (session as any).tvName = text.trim();
        (session as any).adminAction = "tv_awaiting_voice_id";
        await saveSession(sb, chatId, session as any);
        await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `✅ الاسم: *${text.trim()}*\n\nأرسل Voice ID:`, parse_mode: "Markdown", reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "tts_voices_menu" }]] }) });
        return new Response("OK");
      }

      if ((session as any)?.adminAction === "tv_awaiting_voice_id" && text) {
        (session as any).tvVoiceId = text.trim();
        (session as any).adminAction = "tv_awaiting_preview_audio";
        await saveSession(sb, chatId, session as any);
        await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "أرسل ملف صوتي للمعاينة:", reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "tts_voices_menu" }]] }) });
        return new Response("OK");
      }

      if ((session as any)?.adminAction === "tv_awaiting_preview_audio") {
        let fileId: string | null = null;
        if (message.audio) fileId = message.audio.file_id;
        else if (message.voice) fileId = message.voice.file_id;
        else if (message.document?.mime_type?.startsWith("audio/")) fileId = message.document.file_id;
        if (!fileId) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "أرسل ملف صوتي." }); return new Response("OK"); }
        const fileInfo = await tg(BOT_TOKEN, "getFile", { file_id: fileId });
        const filePath = fileInfo.result?.file_path;
        if (!filePath) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "فشل." }); return new Response("OK"); }
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
        const fileResp = await fetch(fileUrl);
        const fileBuffer = await fileResp.arrayBuffer();
        const ext = filePath.split(".").pop() || "ogg";
        const storagePath = `tts-voices/${crypto.randomUUID()}.${ext}`;
        await sb.storage.from("model-media").upload(storagePath, fileBuffer, { contentType: `audio/${ext}`, upsert: true });
        const { data: urlData } = sb.storage.from("model-media").getPublicUrl(storagePath);
        await sb.from("tts_voices").insert({ name: (session as any).tvName || "Untitled", voice_id: (session as any).tvVoiceId || null, preview_audio_url: urlData.publicUrl });
        await clearSession(sb, chatId);
        await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `✅ تم إضافة صوت TTS *${(session as any).tvName}*`, parse_mode: "Markdown", reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "➕ آخر", callback_data: "tv_add" }], [{ text: "🔙", callback_data: "tts_voices_menu" }]] }) });
        return new Response("OK");
      }

      if ((session as any)?.adminAction === "hs_awaiting_name" && text) {
        (session as any).hsName = text.trim();
        (session as any).adminAction = "hs_awaiting_gender";
        await saveSession(sb, chatId, session as any);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ الاسم: *${text.trim()}*\n\nاختر الجنس:`, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [
            [{ text: "👨 Male", callback_data: "hs_gender_male" }, { text: "👩 Female", callback_data: "hs_gender_female" }],
            [{ text: "❌ إلغاء", callback_data: "headshot_menu" }],
          ]}),
        });
        return new Response("OK");
      }

      if ((session as any)?.adminAction === "hs_awaiting_prompt" && text) {
        (session as any).hsPrompt = text.trim();
        (session as any).adminAction = "hs_awaiting_image";
        await saveSession(sb, chatId, session as any);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ البرومبت: *${text.trim().slice(0, 50)}...*\n\nأرسل صورة المعاينة للقالب:`, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "⏭ تخطي (بدون صورة)", callback_data: "hs_skip_image" }], [{ text: "❌ إلغاء", callback_data: "headshot_menu" }]] }),
        });
        return new Response("OK");
      }

      if ((session as any)?.adminAction === "hs_awaiting_image") {
        let fileId: string | null = null;
        if (message.photo?.length > 0) fileId = message.photo[message.photo.length - 1].file_id;
        else if (message.document?.mime_type?.startsWith("image/")) fileId = message.document.file_id;

        let previewUrl: string | null = null;
        if (fileId) {
          const fileInfo = await tg(BOT_TOKEN, "getFile", { file_id: fileId });
          const filePath = fileInfo.result?.file_path;
          if (filePath) {
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
            const fileResp = await fetch(fileUrl);
            const fileBuffer = await fileResp.arrayBuffer();
            const ext = filePath.split(".").pop() || "jpg";
            const storagePath = `headshot-templates/${crypto.randomUUID()}.${ext}`;
            const { error: uploadError } = await sb.storage.from("model-media").upload(storagePath, fileBuffer, { contentType: `image/${ext}`, upsert: true });
            if (!uploadError) {
              const { data: urlData } = sb.storage.from("model-media").getPublicUrl(storagePath);
              previewUrl = urlData.publicUrl;
            }
          }
        }

        const { error } = await sb.from("headshot_templates").insert({
          name: (session as any).hsName || "Untitled",
          gender: (session as any).hsGender || "male",
          prompt: (session as any).hsPrompt || "",
          preview_url: previewUrl,
        });

        await clearSession(sb, chatId);
        if (error) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `❌ خطأ: ${error.message}` });
        } else {
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId,
            text: `✅ *تم إضافة قالب Headshot بنجاح!*\n\n📛 الاسم: ${(session as any).hsName}\n👤 الجنس: ${(session as any).hsGender}\n📸 الصورة: ${previewUrl ? "✅" : "❌"}`,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [
              [{ text: "➕ إضافة قالب آخر", callback_data: "hs_add" }],
              [{ text: "📷 قوالب Headshot", callback_data: "headshot_menu" }],
              [{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }],
            ]}),
          });
        }
        return new Response("OK");
      }

      // ---- Tool card image upload ----
      if ((session as any)?.adminAction === "tool_awaiting_card_image" && (session as any)?.adminModelId) {
        let fileId: string | null = null;
        if (message.photo?.length > 0) fileId = message.photo[message.photo.length - 1].file_id;
        else if (message.document?.mime_type?.startsWith("image/")) fileId = message.document.file_id;

        if (!fileId) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "أرسل صورة فقط.", reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 رجوع", callback_data: "tools_menu" }]] }) });
          return new Response("OK");
        }

        const toolId = (session as any).adminModelId;
        const fileInfo = await tg(BOT_TOKEN, "getFile", { file_id: fileId });
        const filePath = fileInfo.result?.file_path;
        if (!filePath) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "فشل تحميل الملف." }); return new Response("OK"); }

        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
        const fileResp = await fetch(fileUrl);
        const fileBuffer = await fileResp.arrayBuffer();
        const ext = filePath.split(".").pop() || "jpg";
        const storagePath = `tool-cards/${toolId}.${ext}`;
        const { error: uploadError } = await sb.storage.from("model-media").upload(storagePath, fileBuffer, { contentType: `image/${ext}`, upsert: true });
        if (uploadError) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `خطأ: ${uploadError.message}` }); return new Response("OK"); }

        const { data: urlData } = sb.storage.from("model-media").getPublicUrl(storagePath);
        // Upsert card_image_url using memories (since tool_landing_images table may not have column)
        const cardKey = `tool_card_image_${toolId}`;
        await sb.from("memories").delete().eq("key", cardKey);
        await sb.from("memories").insert({ key: cardKey, value: urlData.publicUrl });

        await clearSession(sb, chatId);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ تم تحديث صورة بطاقة \`${toolId}\` بنجاح!`, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🖼 Landing Page Photos", callback_data: "tools_menu" }], [{ text: "🔙 القائمة", callback_data: "main_menu" }]] }),
        });
        return new Response("OK");
      }

      // ---- Tool landing image upload ----
      if ((session as any)?.adminAction === "tool_awaiting_image" && (session as any)?.adminModelId) {
        let fileId: string | null = null;
        if (message.photo?.length > 0) fileId = message.photo[message.photo.length - 1].file_id;
        else if (message.document?.mime_type?.startsWith("image/")) fileId = message.document.file_id;

        if (!fileId) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "أرسل صورة فقط.", reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 رجوع", callback_data: "tools_menu" }]] }) });
          return new Response("OK");
        }

        const toolId = (session as any).adminModelId;
        const fileInfo = await tg(BOT_TOKEN, "getFile", { file_id: fileId });
        const filePath = fileInfo.result?.file_path;
        if (!filePath) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "فشل تحميل الملف." }); return new Response("OK"); }

        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
        const fileResp = await fetch(fileUrl);
        const fileBuffer = await fileResp.arrayBuffer();
        const ext = filePath.split(".").pop() || "jpg";
        const storagePath = `tool-landing/${toolId}.${ext}`;
        const { error: uploadError } = await sb.storage.from("model-media").upload(storagePath, fileBuffer, { contentType: `image/${ext}`, upsert: true });
        if (uploadError) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `خطأ: ${uploadError.message}` }); return new Response("OK"); }

        const { data: urlData } = sb.storage.from("model-media").getPublicUrl(storagePath);
        const { data: existing } = await sb.from("tool_landing_images").select("tool_id").eq("tool_id", toolId).maybeSingle();
        if (existing) {
          await sb.from("tool_landing_images").update({ image_url: urlData.publicUrl, updated_at: new Date().toISOString() }).eq("tool_id", toolId);
        } else {
          await sb.from("tool_landing_images").insert({ tool_id: toolId, image_url: urlData.publicUrl });
        }

        await clearSession(sb, chatId);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ تم تحديث صورة Landing \`${toolId}\` بنجاح!`, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🖼 Landing Page Photos", callback_data: "tools_menu" }], [{ text: "🔙 القائمة", callback_data: "main_menu" }]] }),
        });
        return new Response("OK");
      }

      // ---- Tool landing description ----
      if ((session as any)?.adminAction === "tool_awaiting_desc" && text && (session as any)?.adminModelId) {
        const toolId = (session as any).adminModelId;
        const { data: existing } = await sb.from("tool_landing_images").select("tool_id").eq("tool_id", toolId).maybeSingle();
        if (existing) {
          await sb.from("tool_landing_images").update({ description: text.trim(), updated_at: new Date().toISOString() }).eq("tool_id", toolId);
        } else {
          await sb.from("tool_landing_images").insert({ tool_id: toolId, description: text.trim() });
        }
        await clearSession(sb, chatId);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ تم تحديث وصف \`${toolId}\`:\n${text.trim().slice(0, 100)}`, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🛠 الأدوات", callback_data: "tools_menu" }], [{ text: "🔙 القائمة", callback_data: "main_menu" }]] }),
        });
        return new Response("OK");
      }

      // ---- Tool templates text inputs ----
      if ((session as any)?.adminAction === "tt_awaiting_name" && text) {
        const toolId = (session as any).adminModelId;
        (session as any).ttName = text.trim();
        (session as any).adminAction = "tt_awaiting_gender_choice";
        await saveSession(sb, chatId, session as any);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ الاسم: *${text.trim()}*\n\nاختر الجنس (اختياري):`, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [
            [{ text: "👨 Male", callback_data: "tt_gender_male" }, { text: "👩 Female", callback_data: "tt_gender_female" }],
            [{ text: "⏭ تخطي", callback_data: "tt_gender_skip" }],
            [{ text: "❌ إلغاء", callback_data: `tt_tool_${toolId}` }],
          ]}),
        });
        return new Response("OK");
      }

      // Slide template: awaiting template ID
      if ((session as any)?.adminAction === "st_awaiting_id" && text) {
        (session as any).stTemplateId = text.trim();
        (session as any).adminAction = "st_awaiting_image";
        await saveSession(sb, chatId, session as any);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ Template ID: \`${text.trim()}\`\n\nأرسل صورة المعاينة:`, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "⏭ تخطي (بدون صورة)", callback_data: "st_skip_image" }], [{ text: "❌ إلغاء", callback_data: "slide_templates_menu" }]] }),
        });
        return new Response("OK");
      }

      // Slide template: awaiting image (for new or update)
      if ((session as any)?.adminAction === "st_awaiting_image" && ((session as any)?.stTemplateId || (session as any)?.adminModelId)) {
        let imageUrl: string | null = null;
        let fileId: string | null = null;
        if (message.photo?.length > 0) fileId = message.photo[message.photo.length - 1].file_id;
        else if (message.document?.mime_type?.startsWith("image/")) fileId = message.document.file_id;

        if (fileId) {
          const fileInfo = await tg(BOT_TOKEN, "getFile", { file_id: fileId });
          const filePath = fileInfo.result?.file_path;
          if (filePath) {
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
            const fileResp = await fetch(fileUrl);
            const fileBuffer = await fileResp.arrayBuffer();
            const ext = filePath.split(".").pop() || "jpg";
            const storagePath = `slide-templates/${crypto.randomUUID()}.${ext}`;
            const { error: uploadError } = await sb.storage.from("model-media").upload(storagePath, fileBuffer, { contentType: `image/${ext}`, upsert: true });
            if (!uploadError) {
              const { data: publicUrlData } = sb.storage.from("model-media").getPublicUrl(storagePath);
              imageUrl = publicUrlData.publicUrl;
            }
          }
        }

        if ((session as any)?.adminModelId) {
          // Updating existing template image
          if (imageUrl) await sb.from("slide_templates").update({ image_url: imageUrl }).eq("id", (session as any).adminModelId);
          await clearSession(sb, chatId);
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId, text: imageUrl ? "✅ تم تحديث صورة القالب" : "❌ فشل رفع الصورة", parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 رجوع", callback_data: "slide_templates_menu" }]] }),
          });
          return new Response("OK");
        }

        // Creating new template
        const { count } = await sb.from("slide_templates").select("*", { count: "exact", head: true });
        await sb.from("slide_templates").insert({
          template_id: (session as any).stTemplateId,
          image_url: imageUrl,
          display_order: (count || 0) + 1,
          is_active: true,
        });
        await clearSession(sb, chatId);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ تم إضافة القالب: \`${(session as any).stTemplateId}\``, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 رجوع", callback_data: "slide_templates_menu" }]] }),
        });
        return new Response("OK");
      }

      if ((session as any)?.adminAction === "tt_awaiting_prompt" && text) {
        (session as any).ttPrompt = text.trim();
        (session as any).adminAction = "tt_awaiting_image";
        await saveSession(sb, chatId, session as any);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ البرومبت: *${text.trim().slice(0, 50)}...*\n\nأرسل صورة المعاينة:`, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "⏭ تخطي", callback_data: "tt_skip_image" }], [{ text: "❌ إلغاء", callback_data: "tool_templates_menu" }]] }),
        });
        return new Response("OK");
      }

      if ((session as any)?.adminAction === "tt_awaiting_image") {
        let fileId: string | null = null;
        if (message.photo?.length > 0) fileId = message.photo[message.photo.length - 1].file_id;
        else if (message.document?.mime_type?.startsWith("image/")) fileId = message.document.file_id;

        let previewUrl: string | null = null;
        if (fileId) {
          const fileInfo = await tg(BOT_TOKEN, "getFile", { file_id: fileId });
          const filePath = fileInfo.result?.file_path;
          if (filePath) {
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
            const fileResp = await fetch(fileUrl);
            const fileBuffer = await fileResp.arrayBuffer();
            const ext = filePath.split(".").pop() || "jpg";
            const storagePath = `tool-templates/${crypto.randomUUID()}.${ext}`;
            const { error: uploadError } = await sb.storage.from("model-media").upload(storagePath, fileBuffer, { contentType: `image/${ext}`, upsert: true });
            if (!uploadError) {
              const { data: urlData } = sb.storage.from("model-media").getPublicUrl(storagePath);
              previewUrl = urlData.publicUrl;
            }
          }
        }

        const toolId = (session as any).adminModelId;
        const { error } = await sb.from("tool_templates").insert({
          tool_id: toolId,
          name: (session as any).ttName || "Untitled",
          gender: (session as any).ttGender || null,
          prompt: (session as any).ttPrompt || "",
          preview_url: previewUrl,
        });

        await clearSession(sb, chatId);
        if (error) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `❌ خطأ: ${error.message}` });
        } else {
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId,
            text: `✅ *تم إضافة قالب بنجاح!*\n\n🛠 الأداة: ${toolId}\n📛 الاسم: ${(session as any).ttName}\n📸 الصورة: ${previewUrl ? "✅" : "❌"}`,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [
              [{ text: "➕ إضافة قالب آخر", callback_data: `tt_add_${toolId}` }],
              [{ text: "📋 القوالب", callback_data: `tt_tool_${toolId}` }],
              [{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }],
            ]}),
          });
        }
        return new Response("OK");
      }

      // ---- Page settings text inputs ----
      if (session?.adminAction?.startsWith("ps_") && text) {
        const action = session.adminAction;
        const input = text.trim();

        if (action === "ps_img_styles") {
          const styles = input.split(",").map((s: string) => s.trim()).filter(Boolean);
          const s = await getPageSettings(sb, "images");
          (s as any).styles = styles;
          await savePageSettings(sb, "images", s);
          await clearSession(sb, chatId);
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId, text: `✅ تم تحديث الأنماط: \`${styles.join(", ")}\``, parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🖼 إعدادات الصور", callback_data: "ps_images" }]] }),
          });
          return new Response("OK");
        }

        if (action === "ps_img_aspects") {
          const aspects = input.split(",").map((s: string) => s.trim()).filter(Boolean);
          const s = await getPageSettings(sb, "images");
          (s as any).aspectRatios = aspects;
          await savePageSettings(sb, "images", s);
          await clearSession(sb, chatId);
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId, text: `✅ تم تحديث النسب: \`${aspects.join(", ")}\``, parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🖼 إعدادات الصور", callback_data: "ps_images" }]] }),
          });
          return new Response("OK");
        }

        if (action === "ps_vid_aspects") {
          const aspects = input.split(",").map((s: string) => s.trim()).filter(Boolean);
          const s = await getPageSettings(sb, "videos");
          (s as any).aspectRatios = aspects;
          await savePageSettings(sb, "videos", s);
          await clearSession(sb, chatId);
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId, text: `✅ تم تحديث النسب: \`${aspects.join(", ")}\``, parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🎬 إعدادات الفيديو", callback_data: "ps_videos" }]] }),
          });
          return new Response("OK");
        }

        if (action === "ps_vid_durations") {
          const durations = input.split(",").map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n));
          const s = await getPageSettings(sb, "videos");
          (s as any).durations = durations;
          await savePageSettings(sb, "videos", s);
          await clearSession(sb, chatId);
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId, text: `✅ تم تحديث المدد: \`${durations.join(", ")}s\``, parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🎬 إعدادات الفيديو", callback_data: "ps_videos" }]] }),
          });
          return new Response("OK");
        }

        if (action === "ps_vid_resolutions") {
          const resolutions = input.split(",").map((s: string) => s.trim()).filter(Boolean);
          const s = await getPageSettings(sb, "videos");
          (s as any).resolutions = resolutions;
          await savePageSettings(sb, "videos", s);
          await clearSession(sb, chatId);
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId, text: `✅ تم تحديث الدقات: \`${resolutions.join(", ")}\``, parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🎬 إعدادات الفيديو", callback_data: "ps_videos" }]] }),
          });
          return new Response("OK");
        }
      }

      // ---- Add model text inputs ----
      if (session?.addModelStep === "awaiting_id" && text) {
        const id = text.trim().replace(/\s+/g, "-").toLowerCase();
        session.addModelData = { ...(session.addModelData || {}), id };
        session.addModelStep = "awaiting_name";
        await saveSession(sb, chatId, session);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ ID: \`${id}\`\n\n📛 الخطوة 2/5: أدخل اسم النموذج:`, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 إلغاء", callback_data: "edit_menu" }]] }),
        });
        return new Response("OK");
      }

      if (session?.addModelStep === "awaiting_name" && text) {
        session.addModelData = { ...(session.addModelData || {}), name: text.trim() };
        session.addModelStep = "awaiting_type";
        await saveSession(sb, chatId, session);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ الاسم: *${text.trim()}*\n\n📦 الخطوة 3/5: اختر النوع:`, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [
            [{ text: "🖼 image", callback_data: "am_type_image" }, { text: "🔧 image-tool", callback_data: "am_type_image-tool" }],
            [{ text: "🎬 video", callback_data: "am_type_video" }, { text: "🎬 video-i2v", callback_data: "am_type_video-i2v" }],
            [{ text: "💬 chat", callback_data: "am_type_chat" }, { text: "👤 video-avatar", callback_data: "am_type_video-avatar" }],
            [{ text: "🔙 إلغاء", callback_data: "edit_menu" }],
          ]}),
        });
        return new Response("OK");
      }

      if (session?.addModelStep === "awaiting_credits_text" && text) {
        const credits = parseInt(text.trim());
        if (isNaN(credits) || credits < 0) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "❌ أدخل رقم صحيح:" });
          return new Response("OK");
        }
        session.addModelData = { ...(session.addModelData || {}), credits: String(credits) };
        session.addModelStep = "awaiting_description";
        await saveSession(sb, chatId, session);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ التكلفة: *${credits} MC*\n\n📝 الخطوة 5/5: أدخل وصف النموذج:`, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "⏭ تخطي", callback_data: "am_save" }], [{ text: "🔙 إلغاء", callback_data: "edit_menu" }]] }),
        });
        return new Response("OK");
      }

      if (session?.addModelStep === "awaiting_description" && text) {
        session.addModelData = { ...(session.addModelData || {}), description: text.trim() };
        await saveSession(sb, chatId, session);
        // Auto-save
        const md = session.addModelData;
        const { data: addedData } = await sb.from("memories").select("value").eq("key", "models_added").maybeSingle();
        const added: Record<string, unknown>[] = addedData?.value ? JSON.parse(addedData.value) : [];
        added.push({
          id: md.id, name: md.name || md.id, type: md.type || "image",
          credits: Number(md.credits) || 0, description: md.description || "",
          longDescription: md.description || "", icon: "Image",
          modes: ["text-to-image"], acceptsImages: false, requiresImage: false,
          maxImages: 0, acceptedMimeTypes: [], provider: "Megsy", speed: "standard", quality: "high",
        });
        await sb.from("memories").delete().eq("key", "models_added");
        await sb.from("memories").insert({ key: "models_added", value: JSON.stringify(added) });
        await clearSession(sb, chatId);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `✅ *تم إضافة النموذج بنجاح!*\n\n📌 ID: \`${md.id}\`\n📛 الاسم: *${md.name || md.id}*\n📦 النوع: ${md.type || "image"}\n💰 التكلفة: ${md.credits || 0} MC\n📝 الوصف: ${(md.description || "").slice(0, 50)}`,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [
            [{ text: "✏️ تعديل الإعدادات", callback_data: `emod_${md.id}` }],
            [{ text: "➕ إضافة نموذج آخر", callback_data: "add_model" }],
            [{ text: "🔙 القائمة", callback_data: "edit_menu" }],
          ]}),
        });
        return new Response("OK");
      }

      // ---- Showcase text inputs ----
      // Step 2: receive prompt
      if (session?.showcaseStep === "awaiting_prompt" && text) {
        session.showcasePrompt = text.trim();
        session.showcaseStep = "awaiting_model";
        await saveSession(sb, chatId, session);
        // Show model categories (dynamic)
        const dynCats = await getDynamicCategories(sb);
        const rows = dynCats.map(c => [{
          text: `${c.emoji} ${c.label} (${c.models.length})`,
          callback_data: `sc_cat_${c.key}`,
        }]);
        rows.push([{ text: "❌ إلغاء", callback_data: "showcase_menu" }]);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `✅ البرومبت: *${text.trim().slice(0, 50)}${text.trim().length > 50 ? "…" : ""}*\n\n🤖 الخطوة 3/6: اختر قسم النموذج:`,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: rows }),
        });
        return new Response("OK");
      }

      // Step 6: receive duration text
      if (session?.showcaseStep === "awaiting_duration" && text) {
        const duration = text.trim().toLowerCase() === "skip" ? null : text.trim();
        await saveShowcaseItem(sb, BOT_TOKEN, chatId, session, duration);
        return new Response("OK");
      }

      // Step 1: receive media for showcase
      if (session?.showcaseStep === "awaiting_media") {
        let fileId: string | null = null;
        let mediaType: "image" | "video" = "image";

        if (message.photo?.length > 0) { fileId = message.photo[message.photo.length - 1].file_id; mediaType = "image"; }
        else if (message.video) { fileId = message.video.file_id; mediaType = "video"; }
        else if (message.animation) { fileId = message.animation.file_id; mediaType = "video"; }
        else if (message.document) {
          const mime = message.document.mime_type || "";
          if (mime.startsWith("image/")) { fileId = message.document.file_id; mediaType = "image"; }
          else if (mime.startsWith("video/")) { fileId = message.document.file_id; mediaType = "video"; }
        }

        if (!fileId) {
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId, text: "أرسل صورة أو فيديو فقط.",
            reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "showcase_menu" }]] }),
          });
          return new Response("OK");
        }

        const fileInfo = await tg(BOT_TOKEN, "getFile", { file_id: fileId });
        const filePath = fileInfo.result?.file_path;
        if (!filePath) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "فشل تحميل الملف." }); return new Response("OK"); }

        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
        const fileResp = await fetch(fileUrl);
        const fileBuffer = await fileResp.arrayBuffer();
        const ext = filePath.split(".").pop() || (mediaType === "image" ? "jpg" : "mp4");
        const storagePath = `showcase/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await sb.storage.from("model-media").upload(storagePath, fileBuffer, {
          contentType: mediaType === "image" ? `image/${ext}` : `video/${ext}`,
          upsert: true,
        });

        if (uploadError) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `خطأ في الرفع: ${uploadError.message}` });
          return new Response("OK");
        }

        const { data: urlData } = sb.storage.from("model-media").getPublicUrl(storagePath);
        session.showcaseMediaUrl = urlData.publicUrl;
        session.showcaseMediaType = mediaType;
        session.showcaseStep = "awaiting_prompt";
        await saveSession(sb, chatId, session);

        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `✅ تم رفع ${mediaType === "image" ? "الصورة" : "الفيديو"} بنجاح!\n\n📝 الخطوة 2/6: أدخل البرومبت (الوصف):`,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "showcase_menu" }]] }),
        });
        return new Response("OK");
      }

      // ---- OAuth text inputs ----
      if (session?.oauthStep === "awaiting_name" && text) {
        const appName = text.trim();
        await saveSession(sb, chatId, { oauthStep: "awaiting_uri", oauthAppName: appName });
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `✅ اسم التطبيق: *${appName}*\n\nالآن أدخل Redirect URI:\n(مثال: \`https://myapp.com/callback\`)`,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 إلغاء", callback_data: "oauth_menu" }]] }),
        });
        return new Response("OK");
      }

      if (session?.oauthStep === "awaiting_uri" && text && session.oauthAppName) {
        const uris = text.trim().split("\n").map((u: string) => u.trim()).filter((u: string) => u.length > 0);
        const clientId = `megsy_${generateId(24)}`;
        const clientSecret = generateId(48);
        const secretHash = await hashSecret(clientSecret);

        const { data: app, error } = await sb.from("oauth_clients").insert({
          user_id: "00000000-0000-0000-0000-000000000000",
          client_id: clientId,
          client_secret_hash: secretHash,
          name: session.oauthAppName,
          redirect_uris: uris,
        }).select().single();

        if (error) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `❌ خطأ: ${error.message}` });
          return new Response("OK");
        }

        await clearSession(sb, chatId);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `✅ *تم إنشاء التطبيق بنجاح!*\n\n` +
            `📛 الاسم: *${session.oauthAppName}*\n\n` +
            `📌 Client ID:\n\`${clientId}\`\n\n` +
            `🔐 Client Secret:\n\`${clientSecret}\`\n\n` +
            `⚠️ *احفظ الـ Secret الآن — لن يظهر مرة أخرى!*\n\n` +
            `🔗 Redirect URIs:\n${uris.join("\n")}`,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [
            [{ text: "🔑 عرض التطبيقات", callback_data: "oauth_list" }],
            [{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }],
          ]}),
        });
        return new Response("OK");
      }

      if (session?.oauthStep === "edit_name" && text && session.oauthAppId) {
        await sb.from("oauth_clients").update({ name: text.trim() }).eq("id", session.oauthAppId);
        await clearSession(sb, chatId);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `✅ تم تحديث الاسم إلى: *${text.trim()}*`,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 رجوع للتطبيق", callback_data: `oapp_${session.oauthAppId}` }]] }),
        });
        return new Response("OK");
      }

      if (session?.oauthStep === "edit_uri" && text && session.oauthAppId) {
        const uris = text.trim().split("\n").map((u: string) => u.trim()).filter((u: string) => u.length > 0);
        await sb.from("oauth_clients").update({ redirect_uris: uris }).eq("id", session.oauthAppId);
        await clearSession(sb, chatId);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `✅ تم تحديث Redirect URIs:\n${uris.join("\n")}`,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 رجوع للتطبيق", callback_data: `oapp_${session.oauthAppId}` }]] }),
        });
        return new Response("OK");
      }

      // Upload OAuth app logo
      if (session?.oauthStep === "edit_logo" && session.oauthAppId) {
        let fileId: string | null = null;
        if (message.photo?.length > 0) fileId = message.photo[message.photo.length - 1].file_id;
        else if (message.document?.mime_type?.startsWith("image/")) fileId = message.document.file_id;

        if (!fileId) {
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId, text: "أرسل صورة فقط.",
            reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 إلغاء", callback_data: `oapp_${session.oauthAppId}` }]] }),
          });
          return new Response("OK");
        }

        const fileInfo = await tg(BOT_TOKEN, "getFile", { file_id: fileId });
        const filePath = fileInfo.result?.file_path;
        if (!filePath) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "فشل تحميل الملف." }); return new Response("OK"); }

        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
        const fileResp = await fetch(fileUrl);
        const fileBuffer = await fileResp.arrayBuffer();
        const ext = filePath.split(".").pop() || "jpg";
        const storagePath = `oauth-logos/${session.oauthAppId}.${ext}`;

        const { error: uploadError } = await sb.storage.from("model-media").upload(storagePath, fileBuffer, {
          contentType: `image/${ext}`,
          upsert: true,
        });

        if (uploadError) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `خطأ في الرفع: ${uploadError.message}` });
          return new Response("OK");
        }

        const { data: urlData } = sb.storage.from("model-media").getPublicUrl(storagePath);
        await sb.from("oauth_clients").update({ logo_url: urlData.publicUrl }).eq("id", session.oauthAppId);
        await clearSession(sb, chatId);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `✅ تم تحديث صورة التطبيق بنجاح!`,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 رجوع للتطبيق", callback_data: `oapp_${session.oauthAppId}` }]] }),
        });
        return new Response("OK");
      }

      // رفع أيقونة النموذج
      if (session?.adminAction === "awaiting_icon" && session.adminModelId) {
        let fileId: string | null = null;
        if (message.photo?.length > 0) fileId = message.photo[message.photo.length - 1].file_id;
        else if (message.document) fileId = message.document.file_id;
        if (!fileId) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "أرسل صورة فقط.", reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 إلغاء", callback_data: `emod_${session.adminModelId}` }]] }) });
          return new Response("OK");
        }
        const fileInfo = await tg(BOT_TOKEN, "getFile", { file_id: fileId });
        const filePath = fileInfo.result?.file_path;
        if (!filePath) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "فشل تحميل الملف." }); return new Response("OK"); }
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
        const fileResp = await fetch(fileUrl);
        const fileBuffer = await fileResp.arrayBuffer();
        const ext = filePath.split(".").pop() || "png";
        const storagePath = `model-icons/${session.adminModelId}.${ext}`;
        const { error: uploadError } = await sb.storage.from("model-media").upload(storagePath, fileBuffer, {
          contentType: ext === "svg" ? "image/svg+xml" : `image/${ext}`,
          upsert: true,
        });
        if (uploadError) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `خطأ: ${uploadError.message}` }); return new Response("OK"); }
        const { data: urlData } = sb.storage.from("model-media").getPublicUrl(storagePath);
        const config = await getModelConfig(sb, session.adminModelId);
        config.icon_url = urlData.publicUrl;
        await setModelConfig(sb, session.adminModelId, config);
        await clearSession(sb, chatId);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: `✅ تم رفع أيقونة \`${session.adminModelId}\``, parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "✏️ تعديل", callback_data: `emod_${session.adminModelId}` }], [{ text: "🔙 القائمة", callback_data: "edit_menu" }]] }),
        });
        return new Response("OK");
      }

      // إدخال fal suffix بعد اختيار البادئة
      if (session?.adminAction === "awaiting_fal_suffix" && text && session.adminModelId) {
        const prefix = session.addModelData?._falPrefix || "fal-ai/";
        const fullId = prefix + text.trim();
        const config = await getModelConfig(sb, session.adminModelId);
        config.fal_id = fullId;
        await setModelConfig(sb, session.adminModelId, config);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `✅ تم تحديث *fal_id* → \`${fullId}\``,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [
            [{ text: "✏️ تعديل المزيد", callback_data: `emod_${session.adminModelId}` }],
            [{ text: "🔙 القائمة", callback_data: "edit_menu" }],
          ]}),
        });
        await saveSession(sb, chatId, { adminAction: "idle" });
        return new Response("OK");
      }

      // إدخال OpenRouter suffix بعد اختيار البادئة
      if (session?.adminAction === "awaiting_or_suffix" && text && session.adminModelId) {
        const prefix = session.addModelData?._orPrefix || "";
        const fullId = prefix + text.trim();
        const config = await getModelConfig(sb, session.adminModelId);
        config.openrouter_id = fullId;
        await setModelConfig(sb, session.adminModelId, config);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `✅ تم تحديث *openrouter_id* → \`${fullId}\``,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [
            [{ text: "✏️ تعديل المزيد", callback_data: `emod_${session.adminModelId}` }],
            [{ text: "🔙 القائمة", callback_data: "edit_menu" }],
          ]}),
        });
        await saveSession(sb, chatId, { adminAction: "idle" });
        return new Response("OK");
      }

      // إدخال قيمة حقل
      if (session?.adminAction === "awaiting_value" && text && session.adminModelId && session.adminField) {
        const config = await getModelConfig(sb, session.adminModelId);
        config[session.adminField] = text.trim();
        await setModelConfig(sb, session.adminModelId, config);
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `✅ تم تحديث *${session.adminField}* → \`${text.trim()}\``,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [
            [{ text: "✏️ تعديل المزيد", callback_data: `emod_${session.adminModelId}` }],
            [{ text: "🔙 القائمة", callback_data: "edit_menu" }],
          ]}),
        });
        await saveSession(sb, chatId, { adminAction: "idle" });
        return new Response("OK");
      }

      // إدخال MC مخصص
      if ((session?.adminAction === "mc_add" || session?.adminAction === "mc_sub") && text && session.adminUserId) {
        const amount = parseFloat(text.trim());
        if (isNaN(amount) || amount <= 0) {
          await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "❌ أدخل رقم صحيح موجب:" });
          return new Response("OK");
        }
        const change = session.adminAction === "mc_add" ? amount : -amount;
        await applyMcChange(sb, BOT_TOKEN, chatId, undefined, session.adminUserId, change);
        await saveSession(sb, chatId, { adminAction: "idle" });
        return new Response("OK");
      }

      // رفع صورة / فيديو (model media upload)
      if (session?.page && session.models) {
        const currentModelId = session.models[session.modelIndex || 0];
        const currentModelName = MODEL_NAMES[currentModelId] || currentModelId;
        let fileId: string | null = null;
        let mediaType: "image" | "video" = "image";

        if (message.photo?.length > 0) { fileId = message.photo[message.photo.length - 1].file_id; mediaType = "image"; }
        else if (message.video) { fileId = message.video.file_id; mediaType = "video"; }
        else if (message.animation) { fileId = message.animation.file_id; mediaType = "video"; }
        else if (message.document) {
          const mime = message.document.mime_type || "";
          if (mime.startsWith("image/")) { fileId = message.document.file_id; mediaType = "image"; }
          else if (mime.startsWith("video/")) { fileId = message.document.file_id; mediaType = "video"; }
        }

        if (!fileId) {
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId, text: "أرسل صورة أو فيديو فقط.",
            reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "⏭ تخطي", callback_data: "skip_model" }, { text: "❌ إلغاء", callback_data: "upload_menu" }]] }),
          });
          return new Response("OK");
        }

        const fileInfo = await tg(BOT_TOKEN, "getFile", { file_id: fileId });
        const filePath = fileInfo.result?.file_path;
        if (!filePath) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: "فشل تحميل الملف." }); return new Response("OK"); }

        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
        const fileResp = await fetch(fileUrl);
        const fileBuffer = await fileResp.arrayBuffer();
        const ext = filePath.split(".").pop() || (mediaType === "image" ? "jpg" : "mp4");
        const storagePath = `${currentModelId}.${ext}`;

        const { error: uploadError } = await sb.storage.from("model-media").upload(storagePath, fileBuffer, {
          contentType: mediaType === "image" ? `image/${ext}` : `video/${ext}`,
          upsert: true,
        });

        if (uploadError) { await tg(BOT_TOKEN, "sendMessage", { chat_id: chatId, text: `خطأ في الرفع: ${uploadError.message}` }); return new Response("OK"); }

        const { data: urlData } = sb.storage.from("model-media").getPublicUrl(storagePath);
        await sb.from("model_media").upsert({
          model_id: currentModelId, media_url: urlData.publicUrl, media_type: mediaType, updated_at: new Date().toISOString(),
        }, { onConflict: "model_id" });

        session.modelIndex = (session.modelIndex || 0) + 1;
        const remaining = session.models.length - session.modelIndex;

        if (remaining === 0) {
          await clearSession(sb, chatId);
          await tg(BOT_TOKEN, "sendMessage", {
            chat_id: chatId, text: `✅ تم رفع *${currentModelName}*\n\nانتهت كل النماذج!`, parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🔙 رجوع", callback_data: "upload_menu" }]] }),
          });
          return new Response("OK");
        }

        await saveSession(sb, chatId, session);
        const nextId = session.models[session.modelIndex];
        await tg(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `✅ تم رفع *${currentModelName}*!\n\nالمتبقي: *${remaining}*\n\n🎯 التالي: *${MODEL_NAMES[nextId] || nextId}*\n\`${nextId}\`\n\nأرسل ${session.page === "images" ? "صورة" : "فيديو"}:`,
          parse_mode: "Markdown",
          reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "⏭ تخطي", callback_data: "skip_model" }, { text: "❌ إلغاء", callback_data: "upload_menu" }]] }),
        });
        return new Response("OK");
      }

      // رسالة افتراضية
      await tg(BOT_TOKEN, "sendMessage", {
        chat_id: chatId, text: "اضغط /start للبدء.",
        reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "🚀 ابدأ", callback_data: "main_menu" }]] }),
      });
      return new Response("OK");
    }

    return new Response("OK");
  } catch (e) {
    console.error("Telegram bot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---- دوال مساعدة ----
async function showUsersPage(sb: any, token: string, chatId: number, msgId: number | undefined, page: number) {
  const from = page * USERS_PER_PAGE;
  const { data: users, count } = await sb.from("profiles")
    .select("id, display_name, credits, plan, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + USERS_PER_PAGE - 1);

  const total = count || 0;
  const totalPages = Math.ceil(total / USERS_PER_PAGE) || 1;

  if (!users || users.length === 0) {
    await send(token, chatId, msgId, "لا يوجد مستخدمين.", [[{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }]]);
    return;
  }

  const rows: { text: string; callback_data: string }[][] = users.map((u: any) => [{
    text: `${u.display_name || "مستخدم"} — ${Number(u.credits).toFixed(0)} MC (${u.plan})`,
    callback_data: `uview_${u.id}`,
  }]);

  const navRow: { text: string; callback_data: string }[] = [];
  if (page > 0) navRow.push({ text: "◀️ السابق", callback_data: `users_page_${page - 1}` });
  navRow.push({ text: `${page + 1}/${totalPages}`, callback_data: "noop" });
  if (page < totalPages - 1) navRow.push({ text: "التالي ▶️", callback_data: `users_page_${page + 1}` });
  rows.push(navRow);
  rows.push([{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }]);

  await send(token, chatId, msgId, `👥 *المستخدمين* (${total} إجمالي)\n\nاختر مستخدم:`, rows);
}

async function applyMcChange(sb: any, token: string, chatId: number, msgId: number | undefined, userId: string, change: number) {
  const { data: profile } = await sb.from("profiles").select("credits, display_name").eq("id", userId).single();
  if (!profile) { await send(token, chatId, msgId, "❌ المستخدم غير موجود", [[{ text: "🔙 رجوع", callback_data: "users_menu" }]]); return; }

  const newCredits = Math.max(0, Number(profile.credits) + change);
  await sb.from("profiles").update({ credits: newCredits }).eq("id", userId);
  await sb.from("credit_transactions").insert({
    user_id: userId, amount: Math.abs(change),
    action_type: change >= 0 ? "admin_add" : "admin_deduct",
    description: `أدمن: ${change >= 0 ? "+" : ""}${change} MC`,
  });

  await send(token, chatId, msgId,
    `✅ *${profile.display_name || "مستخدم"}*\n\n` +
    `الرصيد السابق: ${Number(profile.credits).toFixed(1)} MC\n` +
    `التغيير: ${change >= 0 ? "+" : ""}${change}\n` +
    `الرصيد الجديد: ${newCredits.toFixed(1)} MC`,
    [
      [{ text: "👤 عرض المستخدم", callback_data: `uview_${userId}` }],
      [{ text: "🔙 المستخدمين", callback_data: "users_menu" }],
    ]
  );
}

// ---- Showcase save helper ----
async function saveShowcaseItem(sb: any, token: string, chatId: number, session: BotSession, duration: string | null) {
  // Get max display_order
  const { data: maxOrder } = await sb.from("showcase_items")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);
  const nextOrder = (maxOrder && maxOrder.length > 0 ? (maxOrder[0] as any).display_order : 0) + 1;

  const { error } = await sb.from("showcase_items").insert({
    media_url: session.showcaseMediaUrl,
    media_type: session.showcaseMediaType || "image",
    prompt: session.showcasePrompt || "",
    model_id: session.showcaseModelId || "",
    model_name: session.showcaseModelName || "",
    aspect_ratio: session.showcaseAspect || "1:1",
    quality: session.showcaseQuality || "2K",
    duration: duration,
    display_order: nextOrder,
  });

  await clearSession(sb, chatId);

  if (error) {
    await tg(token, "sendMessage", { chat_id: chatId, text: `❌ خطأ في الحفظ: ${error.message}` });
    return;
  }

  await tg(token, "sendMessage", {
    chat_id: chatId,
    text: `✅ *تم إضافة العنصر للمعرض بنجاح!*\n\n` +
      `📝 البرومبت: ${(session.showcasePrompt || "").slice(0, 50)}\n` +
      `🤖 النموذج: ${session.showcaseModelName}\n` +
      `📐 النسبة: ${session.showcaseAspect}\n` +
      `🎯 الجودة: ${session.showcaseQuality}\n` +
      (duration ? `⏱ المدة: ${duration}\n` : "") +
      `🔢 الترتيب: ${nextOrder}`,
    parse_mode: "Markdown",
    reply_markup: JSON.stringify({ inline_keyboard: [
      [{ text: "➕ إضافة عنصر آخر", callback_data: "sc_add" }],
      [{ text: "📋 عرض المعرض", callback_data: "sc_list_0" }],
      [{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }],
    ]}),
  });
}
