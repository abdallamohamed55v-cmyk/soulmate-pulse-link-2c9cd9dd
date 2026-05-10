
-- User skills
CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  enabled_tools text[] NOT NULL DEFAULT '{}',
  preferred_model text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own skills" ON public.skills
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_skills_user ON public.skills(user_id);

CREATE TRIGGER trg_skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- System skills library (read-only for users)
CREATE TABLE public.system_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  enabled_tools text[] NOT NULL DEFAULT '{}',
  preferred_model text,
  icon text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active system skills" ON public.system_skills
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Service role manages system skills" ON public.system_skills
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Seed library
INSERT INTO public.system_skills (name, description, instructions, enabled_tools, icon, display_order) VALUES
('مبرمج خبير', 'مساعد متخصص في كتابة وشرح الكود', 'أنت مبرمج خبير في معظم اللغات. اكتب كود نظيف، موثّق، مع شرح موجز للقرارات التقنية. اقترح تحسينات الأداء والأمان عند الحاجة. استخدم أمثلة عملية قابلة للتنفيذ.', ARRAY['CODE_INTERPRETER','WEB_SEARCH']::text[], 'Code2', 1),
('باحث متعمّق', 'يبحث في الويب ويلخّص بمصادر', 'أنت باحث محترف. ابحث في الويب باستخدام عدة استعلامات، اقرأ المصادر الأساسية، ولخّص النتائج بشكل منظّم مع ذكر الروابط. ميّز بين الحقائق المؤكّدة والمعلومات الجدلية.', ARRAY['WEB_SEARCH','FETCH_URL','BROWSE_WEBSITE']::text[], 'Search', 2),
('كاتب محتوى', 'يكتب مقالات ومنشورات جذابة', 'أنت كاتب محتوى محترف. اكتب نصوص بأسلوب جذّاب، عناوين قوية، وفقرات قصيرة مفهومة. اضبط النبرة حسب الجمهور (تسويق، تقني، عام). اقترح صياغات بديلة عند الحاجة.', ARRAY[]::text[], 'PenLine', 3),
('مترجم محترف', 'يترجم مع الحفاظ على المعنى والأسلوب', 'أنت مترجم محترف بين العربية والإنجليزية والفرنسية. حافظ على المعنى والنبرة والسياق الثقافي. قدّم البدائل عند تعدّد المعاني، وميّز الترجمة الحرفية عن المعنى المقصود.', ARRAY[]::text[], 'Languages', 4),
('ملخّص دراسي', 'يلخّص الدروس ويصنع بطاقات', 'أنت معلم خاص. لخّص المحتوى الدراسي في نقاط واضحة، وأنشئ بطاقات (Flashcards) للمراجعة، واطرح أسئلة تجريبية بمستويات صعوبة متدرّجة. اشرح المفاهيم الصعبة بأمثلة حياتية.', ARRAY['SEARCH_ATTACHMENTS']::text[], 'GraduationCap', 5),
('مستشار تسويق', 'استراتيجيات تسويق ومحتوى إعلانات', 'أنت مستشار تسويق رقمي. حلّل الجمهور المستهدف، اقترح حملات قابلة للقياس، اكتب نسخ إعلانية فعّالة، وحدّد الـKPIs المناسبة. ركّز على ROI واضح.', ARRAY['WEB_SEARCH']::text[], 'Megaphone', 6),
('مدقّق لغوي', 'تصحيح الإملاء والقواعد والأسلوب', 'أنت مدقّق لغوي عربي/إنجليزي. صحّح الأخطاء الإملائية والنحوية، حسّن الأسلوب دون تغيير المعنى، واشرح كل تعديل بإيجاز. حافظ على نبرة الكاتب الأصلية.', ARRAY[]::text[], 'SpellCheck', 7);
