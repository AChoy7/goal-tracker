-- 0001_init.sql
-- Personal Goal Tracker — v1 initial schema
-- Source: docs/SPEC.md section 3
--
-- Table order matters here: exercises is created before goals because
-- goals.exercise_id references exercises(id). The spec lists goals first
-- for readability, but Postgres needs the referenced table to exist first.

-- ========== EXERCISES ==========
-- Growing master list, scoped per user. The first time you log a new
-- exercise name, insert a row here; from then on it appears in the
-- dropdown/autocomplete for every future session (see SPEC.md 4.6).
create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,                     -- "Back squat", "Box jump"
  category text,                          -- 'strength' | 'plyometric' | 'conditioning'
  unit text not null default 'lbs'        -- 'lbs' | 'reps' | 'seconds'
);

-- ========== GOALS ==========
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  title text not null,
  category text,                          -- 'soccer' | 'project' | 'personal'
  description text,
  target_date date,
  status text not null default 'active',  -- 'active' | 'complete' | 'abandoned'
  completed_at timestamptz,

  -- goal_type distinguishes manually-completed goals from goals that
  -- auto-complete based on workout data (e.g. "hit 205 on squat")
  goal_type text not null default 'manual',   -- 'manual' | 'exercise_threshold'
  exercise_id uuid references exercises(id),  -- set when goal_type = 'exercise_threshold'
  target_weight numeric,
  target_reps int,

  created_at timestamptz not null default now()
);

-- ========== HABITS (recurring) ==========
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  goal_id uuid references goals(id),      -- optional link, e.g. lift habit -> soccer goal
  title text not null,                    -- "Drink water", "Lift", "Read Bible"
  habit_type text not null default 'simple',  -- 'simple' | 'workout'
                                           -- 'workout' habits don't carry a fixed
                                           -- exercise list — they just mean "log a
                                           -- session today" and get marked complete
                                           -- when a session is saved
  frequency text not null,                -- 'daily' | 'weekly' | 'specific_days'
  target numeric not null default 1,      -- e.g. 8 (cups), 1 (session)
  unit text,                              -- 'cups', 'sessions', 'chapters', 'minutes'
  days_of_week int[],                     -- used when frequency = 'specific_days', 0=Sun..6=Sat
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ========== LOGS (daily check-ins for simple habits) ==========
create table logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  habit_id uuid not null references habits(id),
  date date not null,
  value numeric,                          -- e.g. 6 (cups drunk)
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

-- ========== TASKS (one-off) ==========
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  goal_id uuid references goals(id),
  title text not null,
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ========== WORKOUT SESSIONS ==========
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  habit_id uuid references habits(id),    -- if this session fulfills a 'workout' habit
  date date not null,
  session_type text,                      -- 'lift' | 'plyo' | 'conditioning'
  notes text,
  created_at timestamptz not null default now()
);

create table set_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  set_number int not null,
  weight numeric,
  reps int,
  rpe numeric,                            -- optional, rate of perceived exertion
  created_at timestamptz not null default now()
);

-- ========== INDEXES ==========
create index on logs (user_id, date);
create index on set_entries (session_id);
create index on set_entries (exercise_id);
create index on workout_sessions (user_id, date);

-- ========== ROW-LEVEL SECURITY ==========
-- Single-user app today, but RLS costs nothing to add now and prevents any
-- accidental data leakage if this ever has more than one account.

alter table exercises enable row level security;
alter table goals enable row level security;
alter table habits enable row level security;
alter table logs enable row level security;
alter table tasks enable row level security;
alter table workout_sessions enable row level security;
alter table set_entries enable row level security;

-- exercises, goals, habits, logs, tasks, workout_sessions all carry user_id
-- directly, so each gets the same four policies (select/insert/update/delete
-- scoped to auth.uid()).

create policy "select own exercises" on exercises for select using (auth.uid() = user_id);
create policy "insert own exercises" on exercises for insert with check (auth.uid() = user_id);
create policy "update own exercises" on exercises for update using (auth.uid() = user_id);
create policy "delete own exercises" on exercises for delete using (auth.uid() = user_id);

create policy "select own goals" on goals for select using (auth.uid() = user_id);
create policy "insert own goals" on goals for insert with check (auth.uid() = user_id);
create policy "update own goals" on goals for update using (auth.uid() = user_id);
create policy "delete own goals" on goals for delete using (auth.uid() = user_id);

create policy "select own habits" on habits for select using (auth.uid() = user_id);
create policy "insert own habits" on habits for insert with check (auth.uid() = user_id);
create policy "update own habits" on habits for update using (auth.uid() = user_id);
create policy "delete own habits" on habits for delete using (auth.uid() = user_id);

create policy "select own logs" on logs for select using (auth.uid() = user_id);
create policy "insert own logs" on logs for insert with check (auth.uid() = user_id);
create policy "update own logs" on logs for update using (auth.uid() = user_id);
create policy "delete own logs" on logs for delete using (auth.uid() = user_id);

create policy "select own tasks" on tasks for select using (auth.uid() = user_id);
create policy "insert own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "update own tasks" on tasks for update using (auth.uid() = user_id);
create policy "delete own tasks" on tasks for delete using (auth.uid() = user_id);

create policy "select own workout_sessions" on workout_sessions for select using (auth.uid() = user_id);
create policy "insert own workout_sessions" on workout_sessions for insert with check (auth.uid() = user_id);
create policy "update own workout_sessions" on workout_sessions for update using (auth.uid() = user_id);
create policy "delete own workout_sessions" on workout_sessions for delete using (auth.uid() = user_id);

-- set_entries has no user_id column directly — it's scoped through its
-- parent workout_sessions row, so the policy checks ownership via a subquery.

create policy "select own set_entries" on set_entries for select using (
  exists (
    select 1 from workout_sessions
    where workout_sessions.id = set_entries.session_id
    and workout_sessions.user_id = auth.uid()
  )
);
create policy "insert own set_entries" on set_entries for insert with check (
  exists (
    select 1 from workout_sessions
    where workout_sessions.id = set_entries.session_id
    and workout_sessions.user_id = auth.uid()
  )
);
create policy "update own set_entries" on set_entries for update using (
  exists (
    select 1 from workout_sessions
    where workout_sessions.id = set_entries.session_id
    and workout_sessions.user_id = auth.uid()
  )
);
create policy "delete own set_entries" on set_entries for delete using (
  exists (
    select 1 from workout_sessions
    where workout_sessions.id = set_entries.session_id
    and workout_sessions.user_id = auth.uid()
  )
);
