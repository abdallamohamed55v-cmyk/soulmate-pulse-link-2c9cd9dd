
-- Learn profile: per-user interests, level, analogy style
create table if not exists public.learn_profile (
  user_id uuid primary key,
  interests text[] default '{}',
  level text,
  analogy_style text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learn_profile enable row level security;

create policy "learn_profile select own" on public.learn_profile
  for select using (auth.uid() = user_id);
create policy "learn_profile insert own" on public.learn_profile
  for insert with check (auth.uid() = user_id);
create policy "learn_profile update own" on public.learn_profile
  for update using (auth.uid() = user_id);

create trigger learn_profile_updated_at
  before update on public.learn_profile
  for each row execute function public.update_updated_at_column();

-- Learn sessions: per-session study tracking
create table if not exists public.learn_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  conversation_id uuid,
  topic text,
  duration_min int default 0,
  questions_total int default 0,
  questions_correct int default 0,
  weak_topics jsonb default '[]'::jsonb,
  mastered_topics jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.learn_sessions enable row level security;

create policy "learn_sessions select own" on public.learn_sessions
  for select using (auth.uid() = user_id);
create policy "learn_sessions insert own" on public.learn_sessions
  for insert with check (auth.uid() = user_id);
create policy "learn_sessions update own" on public.learn_sessions
  for update using (auth.uid() = user_id);

create index if not exists learn_sessions_user_created_idx
  on public.learn_sessions(user_id, created_at desc);
