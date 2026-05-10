
## الهدف

استبدال نظام السلايدس الحالي المعتمد على خدمة DDS الخارجية بنظام داخلي يولد **مواقع Landing Page كاملة** (وليس سلايدس) عبر OpenRouter، مع streaming حر للـ AI، ويُعرض الناتج كموقع حقيقي في iframe + route عام للمشاركة.

## المكدس التقني

- **مزود AI**: OpenRouter (مفتاح واحد للوصول لجميع النماذج).
- **النموذج المقترح** (رخيص + قوي جداً في البرمجة):
  - **`deepseek/deepseek-chat-v3.1`** — الأفضل سعراً/أداءً للـ JSX (~$0.27/M input، $1.10/M output).
  - بديل أرخص: `qwen/qwen3-coder` أو `deepseek/deepseek-chat`.
  - يُحفظ كمتغير قابل للتعديل في الـ edge function.
- **صيغة المخرج**: مكونات React/JSX خام تُجمع في صفحة واحدة.
- **العرض**: مزدوج — iframe بـ srcdoc للمعاينة الفورية + route ديناميكي `/site/:id` للمشاركة.

## التغييرات في قاعدة البيانات

استبدال جدول السلايدس الحالي:

**جدول جديد `generated_sites`:**
- `id`, `user_id`, `title`, `prompt`
- `jsx_code` (text) — كود JSX المولد كاملاً
- `html_compiled` (text) — HTML نهائي مع Tailwind CDN للعرض في iframe
- `model_used`, `tokens_used`
- `share_slug` (unique) — للرابط العام
- `is_public` (bool), `status` (generating/completed/failed)
- `created_at`, `updated_at`
- RLS: المالك يدير، والعموم يقرؤون عند `is_public=true`.

**حذف/أرشفة**: `slide_templates`، `slide_template_palettes` (المرتبطة بالنظام القديم) — أو إبقاؤها مؤقتاً مع تعطيل الواجهة.

## الـ Backend (Edge Function واحدة)

**`supabase/functions/generate-site/index.ts`**:

1. يستقبل `{ prompt, siteId? }` من المستخدم المصادق.
2. ينشئ سجلاً في `generated_sites` بحالة `generating`.
3. يستدعي OpenRouter بـ `stream: true`:
   - `Authorization: Bearer ${OPENROUTER_API_KEY}`
   - System prompt حر يحث الـ AI على إبداع كامل في التصميم (hero, features, testimonials, pricing, CTA, footer) باستخدام Tailwind + Framer Motion + lucide icons.
   - بدون JSON schema صارم — حرية كاملة للنموذج.
4. يبث SSE مباشرة للعميل (نفس نمط `chat` في docs).
5. عند الانتهاء: يجمع الكود الكامل، يحوّله لـ HTML قابل للعرض في iframe (Tailwind CDN + Babel standalone لتشغيل JSX داخل iframe بدون build)، يحفظه في DB، ويرسل event `[DONE]` مع `siteId`.

**`generate-site/compile.ts`**: helper يلف JSX داخل قالب HTML مع:
```html
<script src="tailwindcss CDN"></script>
<script src="babel standalone"></script>
<script type="text/babel" data-presets="react">
  // الكود المولد + ReactDOM.render
</script>
```

## Frontend

**استبدال صفحة السلايدس بـ:**

1. **`/sites`** — قائمة المواقع المولدة للمستخدم (شبكة بطاقات بصور thumbnails من iframe).
2. **`/sites/new`** — صفحة الإنشاء:
   - حقل prompt كبير + زر "ولّد".
   - أثناء التوليد: panel جانبي يعرض الكود يتدفق سطراً بسطر (Streaming).
   - بجانبه iframe حي يُحدّث كل ثانية تقريباً بالكود التراكمي (live preview).
3. **`/sites/:id`** — تحرير/إعادة توليد + معاينة كاملة.
4. **`/site/:slug`** — Route عام (بدون auth) يعرض الموقع المولد كصفحة كاملة منفصلة عبر iframe ملء الشاشة، مع meta tags للـ SEO.

**مكون `LiveSitePreview`**: يستقبل JSX المتدفق، يلفه في HTML template، ويضعه في `<iframe srcDoc={html}>`.

## التدفق الكامل

```text
User → /sites/new → كتابة prompt → POST /generate-site (stream)
   ↓
edge function → OpenRouter (deepseek-v3.1, stream:true)
   ↓ (SSE chunks)
Frontend ← يعرض الكود يكتب نفسه + iframe live preview يتحدث
   ↓
[DONE] → حفظ في DB → redirect /sites/:id → زر "نشر/شارك" → /site/:slug
```

## Secrets المطلوبة

- `OPENROUTER_API_KEY` (سيُطلب من المستخدم بعد الموافقة).

## نقاط مهمة

- **حرية الـ AI**: لا JSON schema، لا tool calling — فقط system prompt إبداعي + raw JSX output. نستخرج الكود من بين ` ```jsx ... ``` ` أو نأخذه كاملاً.
- **الأمان**: iframe مع `sandbox="allow-scripts"` لعزل الكود المولد عن التطبيق الأم.
- **التكلفة**: deepseek-v3.1 يولد صفحة كاملة (~5K tokens) بأقل من سنت واحد.
- **النظام القديم**: نحذف edge functions: `generate-slides`, `slide-template-*` ونعطل route `/files` الخاص بالسلايدس.

## الخطوات بالترتيب

1. إنشاء secret `OPENROUTER_API_KEY`.
2. Migration: جدول `generated_sites` + RLS، أرشفة جداول السلايدس القديمة.
3. Edge function `generate-site` مع SSE streaming من OpenRouter.
4. Routes الجديدة: `/sites`, `/sites/new`, `/sites/:id`, `/site/:slug`.
5. مكون `LiveSitePreview` للمعاينة المباشرة أثناء streaming.
6. حذف/إخفاء واجهات السلايدس القديمة.
