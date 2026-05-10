-- Student profile for education mode
CREATE TABLE public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  age integer,
  native_language text,
  country text,
  learning_style text,
  preferred_study_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own student profile" ON public.student_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Learning topics & progress
CREATE TABLE public.student_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  level text NOT NULL DEFAULT 'beginner',
  progress integer NOT NULL DEFAULT 0,
  last_position text,
  last_studied_at timestamptz,
  curriculum_map jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own topics" ON public.student_topics
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_student_topics_user ON public.student_topics(user_id);

CREATE TRIGGER update_student_topics_updated_at
  BEFORE UPDATE ON public.student_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mistakes log + spaced repetition
CREATE TABLE public.student_mistakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  concept text NOT NULL,
  mistake_count integer NOT NULL DEFAULT 1,
  mistake_type text NOT NULL DEFAULT 'concept',
  next_review_at timestamptz NOT NULL DEFAULT now() + interval '1 day',
  review_stage integer NOT NULL DEFAULT 0,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_mistakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mistakes" ON public.student_mistakes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_student_mistakes_review ON public.student_mistakes(user_id, next_review_at) WHERE resolved = false;

CREATE TRIGGER update_student_mistakes_updated_at
  BEFORE UPDATE ON public.student_mistakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Exam history
CREATE TABLE public.student_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  topic text,
  difficulty text NOT NULL DEFAULT 'medium',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score numeric NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  weak_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own exams" ON public.student_exams
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_student_exams_user ON public.student_exams(user_id, created_at DESC);

-- Focus sessions
CREATE TABLE public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_name text NOT NULL,
  planned_minutes integer NOT NULL DEFAULT 25,
  actual_seconds integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress',
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own focus sessions" ON public.focus_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_focus_sessions_user ON public.focus_sessions(user_id, created_at DESC);

-- Study plans
CREATE TABLE public.study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subjects text NOT NULL,
  exam_date date,
  hours_per_day integer NOT NULL DEFAULT 3,
  level text NOT NULL DEFAULT 'intermediate',
  weak_areas text,
  plan_content text NOT NULL DEFAULT '',
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own study plans" ON public.study_plans
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_study_plans_user ON public.study_plans(user_id, created_at DESC);

CREATE TRIGGER update_study_plans_updated_at
  BEFORE UPDATE ON public.study_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();