# خطة إعادة بناء قوالب المستندات

نبدأ من الصفر بأسلوب **Editorial Magazine** حديث (مستوحى من Editorial New, Pitchfork redesign, The Browser Company, Are.na, Vellum). الفكرة: تايبوغرافي كبيرة جدًا، Serif معبّر، مساحات بيضاء سخية، Drop caps، Pull quotes، أرقام Mono، شبكات غير متماثلة، أكسنت لون واحد قوي.

## 1. الهيكل الجديد (مهم)

النظام الحالي بيختار الثيم حسب `kind` فقط. هنغيره بحيث كل **قالب فردي** له هويته الخاصة (Theme + HTML shell + system prompt hints). يعني `themeFor(kind, template)` تبقى `themeFor(template)` بتاعت قالب محدد بـ `template.id`.

## 2. القوالب الـ12 المقترحة (3 لكل نوع)

### Document (مستند عام)
1. **Broadsheet** — Serif ضخم (Fraunces 96px)، خلفية كريمي `#fbf7f5`، أكسنت برتقالي محروق `#e84c2b`، Drop cap في أول فقرة، Pull quotes مائلة كبيرة، أرقام صفحات Mono.
2. **Quiet** — أبيض نقي، Sans أنيق (Inter Tight)، أعمدة ضيقة محاذاة وسط، خط فاصل ذهبي رفيع، مينيمال راقي شبه Apple Newsroom.
3. **Manuscript** — خلفية ورق `#f4ede0`، Serif كلاسيكي (Cormorant)، أرقام أقسام رومانية، حواشي جانبية، شكل كتاب أدبي.

### Report (تقرير)
1. **Quarterly** — كريمي/أسود، Display Serif للعناوين + Mono للأرقام الكبيرة، جداول KPI بحدود رفيعة، Callouts ملونة، Footnotes مرقمة.
2. **Field Notes** — خلفية كرافت `#e8dfce`، Serif مكتبي، Sidebar بأرقام إحصائية ضخمة، شكل تقرير بحثي.
3. **Briefing** — أبيض، شبكة 12 عمود، عناوين Sans عريضة قصيرة، Executive summary في صندوق ملوّن أعلى الصفحة، Bullets مع Dividers.

### Letter (خطاب)
1. **Correspondence** — كريمي، Serif يدوي (Fraunces Italic للتحية)، توقيع بخط مختلف، تاريخ يمين علوي بـ Mono، شكل خطاب شخصي راقي.
2. **Memorandum** — أبيض، Header بـ FROM/TO/RE/DATE في جدول Mono، نص Sans، شكل مذكرة شركات أنيقة.
3. **Invitation** — خلفية داكنة `#0e0e10` + ذهبي `#c9a84c`، Serif إيطالي كبير وسط الصفحة، شكل دعوة فاخرة.

### Resume (سيرة ذاتية)
1. **Editorial CV** — كريمي، الاسم بـ Display Serif ضخم 88px، خلاصة بـ Pull quote، خبرات Timeline بأرقام Mono على اليسار، Skills كـ inline tags بدون حدود.
2. **Two-Column** — يسار 35% (داكن، Avatar/Contact/Skills) + يمين 65% (أبيض، Experience). أنيق ومتوازن.
3. **Minimalist** — أبيض كامل، Inter Tight، خط فاصل واحد فقط، أقسام مفصولة بمسافات واسعة، شكل Swiss نظيف للمناصب التقنية.

## 3. تايبوغرافي وألوان موحّدة (Tokens)

```
--bg: #fbf7f5         /* كريمي ورق */
--ink: #1a1614        /* أسود حبر */
--muted: #6b6660
--line: #e8e0d8
--accent: #e84c2b     /* برتقالي محروق - hero */
--accent-2: #c9a84c   /* ذهبي - secondary */
--font-display: "Fraunces", "DM Serif Display", serif
--font-body: "Inter Tight", system-ui
--font-mono: "JetBrains Mono", monospace
```

كل قالب يبدّل 1-2 توكن فقط (مثلاً Manuscript يبدّل bg + display font).

## 4. عناصر الـ Editorial المشتركة

- **H1 Hero**: `clamp(56px, 9vw, 128px)` Serif، line-height 0.95، حرف داخل `<em>` مائل بلون `--accent`
- **Drop cap** على أول `<p>` بعد H1: `float:left; font-size:5em; line-height:0.85; padding:8px 12px 0 0; font-family: Serif`
- **H2**: counter() مرقّمة بـ Mono صغير `01 — Section name` بخط Serif
- **Pull quote**: `<blockquote>` بحجم 32-44px مائل، حد علوي وسفلي رفيع، بدون اقتباسات
- **Tables**: حدود أفقية فقط، Header Mono uppercase tracking-wide
- **Lead paragraph** (أول فقرة): حجم أكبر 1.25em، رمادي `--muted`
- **Footer/Page chrome**: رقم صفحة Mono + اسم الوثيقة

## 5. خطوات التنفيذ

1. **DB**: migration لإفراغ جدول `document_templates` وإدراج 12 صف جديد بـ id/kind/name/description/category/sort_order ثابتة. الـ id بيكون مفتاح للثيم (`broadsheet`, `quiet`, `manuscript`, ...).
2. **generate-document/index.ts**:
   - استبدال `themeFor` بدالة `themeForTemplate(templateId, kind)` ترجع Theme كامل.
   - تحديث `buildHtmlShell` بحيث يستقبل templateId ويُولّد CSS مخصّص (Drop cap, counters, pull quotes, fonts).
   - تحسين الـ system prompt لكل قالب (مثلاً Broadsheet يطلب Pull quote واحد على الأقل + lead paragraph).
3. **معاينات (preview thumbnails)**: نولّد SVG previews مبسّطة بنفس الستايل لكل قالب يتعرضوا في الـ TemplatePicker (اختياري — يمكن تأجيله).
4. **الواجهة**: ما تتغيرش — هي بتقرأ من الـ DB.

## 6. ترتيب التسليم

نتفق على القوالب الـ12 → migration للـ DB → كود الـ edge function → اختبار توليد واحد من كل نوع → تكرار الصقل.

---

## Technical details

- ملف الـ edge function الحالي 496 سطر — التغيير يخص: حذف `themeFor` (سطر 34-69)، استبدال `buildHtmlShell` (سطر 71-318 تقريبًا)، وإضافة `TEMPLATE_THEMES` map.
- جدول `document_templates` موجود بالفعل (أعمدة: id, kind, name, description, category, sort_order). الـ id كـ TEXT يخدم كمفتاح للثيم.
- استخدام `@import` من Google Fonts داخل CSS الـ shell لجلب Fraunces / Inter Tight / JetBrains Mono / Cormorant.
- لا تغييرات في الواجهة الأمامية ولا في فلو الجلب.

