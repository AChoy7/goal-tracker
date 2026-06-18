# Personal Goal Tracker — v1 Spec

## 1. Purpose

A personal accountability dashboard for tracking daily habits, workouts (lifting +
plyometrics for soccer prep), one-off tasks, and longer-term goals. Single user
(Andrew only). Installable as a PWA so it behaves like a mobile app.

v1 is fully deterministic — no AI/Claude API calls anywhere in this version. The
goal is a fast, reliable logging loop that's actually used daily before any AI layer
gets added in v2.

---

## 2. Tech stack

- **Frontend:** React + Vite + Tailwind, installable PWA (`vite-plugin-pwa`)
- **Data + auth:** Supabase (Postgres, Auth, Row-Level Security)
- **State management:** TanStack Query for server state
- **Charts:** Recharts (exercise progress, volume over time)
- **Hosting:** Vercel (frontend), Supabase (hosted backend)

No FastAPI service in v1 — there's no AI/external API to broker, so it would just be
unnecessary infrastructure. It gets introduced in v2 to own Claude API calls.

---

## 3. Database schema (Supabase / Postgres)

Design principle throughout: **definition tables are separate from log tables.**
Habits/goals/exercises define *what* you're committing to; logs/sessions/set_entries
record *what actually happened*. Streaks, dashboards, and progress charts are always
computed from the log tables, never stored as standalone counters.

All tables have `user_id uuid references auth.users` and RLS policies scoping every
row to `auth.uid() = user_id`. Single-user app, but RLS costs nothing to add now and
prevents any accidental data leakage.

```sql
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
                                           -- exercise list (see note below) — they
                                           -- just mean "log a session today" and get
                                           -- marked complete when a session is saved
  frequency text not null,                -- 'daily' | 'weekly' | 'specific_days'
  target numeric not null default 1,      -- e.g. 8 (cups), 1 (session)
  unit text,                              -- 'cups', 'sessions', 'chapters', 'minutes'
  days_of_week int[],                     -- used when frequency = 'specific_days', 0=Sun..6=Sat
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- NOTE: no habit_exercise_templates table. Splits vary every session, so a
-- 'workout' habit (e.g. "Lift") does NOT pre-fill a fixed exercise list. Instead,
-- the exercises table (below) grows organically: any exercise name you enter once
-- becomes available in the dropdown/autocomplete for every future session. See
-- section 4.6 for the exact "grows as you use it" lookup pattern.

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

-- ========== WORKOUTS ==========
-- exercises is a growing master list, scoped per user. The first time you log a
-- new exercise name, insert a row here; from then on it appears in the
-- dropdown/autocomplete for every future session (see 4.6).
create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,                     -- "Back squat", "Box jump"
  category text,                          -- 'strength' | 'plyometric' | 'conditioning'
  unit text not null default 'lbs'        -- 'lbs' | 'reps' | 'seconds'
);

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
```

### Indexes worth adding from day one

```sql
create index on logs (user_id, date);
create index on set_entries (session_id);
create index on set_entries (exercise_id);
create index on workout_sessions (user_id, date);
```

---

## 4. Core derived queries

These are the queries that power the UI. None of them are AI — all SQL/aggregation.

### 4.1 Today's expected habits vs. completed

For a given date, generate the set of habits expected (based on `frequency` /
`days_of_week`), left join against `logs` for that date. Anything without a
matching log row is still open.

### 4.2 Daily completion percentage

`completed_habits_today / expected_habits_today`. This single number powers three
features at once: the Today dashboard progress indicator, the streak calculation,
and (later, v1.5) the contribution graph cell color. Compute it once, reuse it
everywhere — don't write three different versions of this query.

### 4.3 Streak (consecutive qualifying days)

A day "qualifies" if its completion percentage (4.2) is **>= 80%**. Streak = count
of consecutive qualifying days walking backward from yesterday. Today is shown
separately as "pending" / "at risk" rather than counted, since the day isn't over —
mirrors how Snapchat handles same-day status. Suggested UX: once a fixed cutoff
(e.g. 6pm local) passes and today is still under 80%, flag the streak indicator as
"at risk" in the UI.

This is a live query off `logs`, not a stored counter, for the same reason streaks
elsewhere in this app aren't stored — recomputing is cheap at this data volume and
avoids ever needing to handle counter drift/correction logic.

### 4.4 Exercise progress

Per exercise: max weight per session over time, estimated 1RM (Epley formula:
`weight * (1 + reps/30)`) off top sets, total volume (`sum(weight * reps)`) per
session. Powers the Recharts line/bar charts on the history screen.

### 4.5 Exercise threshold goal auto-completion

On every new `set_entries` insert: check open goals where `goal_type =
'exercise_threshold'` and `exercise_id` matches the logged exercise. If
`weight >= target_weight` (and `reps >= target_reps` if set), update that goal to
`status = 'complete'`, `completed_at = today`. This is what triggers the gold
contribution-graph cell later — pure SQL trigger or application-level check, no AI.

### 4.6 Exercise autocomplete (grows as you use it)

No fixed exercise list ships with the app, and there's no per-habit template —
splits vary every session, so the exercise picker has to grow organically:

1. When logging a set, the exercise field is a combobox/autocomplete querying
   `select id, name from exercises where user_id = auth.uid() order by name`.
2. If you type a name that doesn't match an existing row, show an inline "Add
   '{name}' as a new exercise" option. Selecting it inserts a new `exercises` row
   (prompt for `category` and default `unit` at that point, or default
   `category = null`, `unit = 'lbs'` and let it be edited later).
3. From that point on, the new exercise appears in the dropdown for every future
   session — no separate "manage exercises" screen is required for v1, though one
   can be added later for renaming/merging duplicates (e.g. "Squat" vs "Back
   Squat").

This is the entire mechanism — no AI matching/fuzzing needed since you're typing
from a dropdown, not free text that needs to be parsed.

---

## 5. Screens

### 5.1 Auth
Supabase Auth, email/password is sufficient for a single-user app. No need for
social login complexity in v1.

### 5.2 Today dashboard
- Streak indicator at the top (number + flame icon, tap for history)
- List of today's expected habits/tasks with checkboxes / quick-entry inputs
- Tapping a "workout" type habit (e.g. "Lift") opens the workout logging screen
  blank/freeform — pick exercises for that session from the growing dropdown (4.6),
  no pre-filled template since splits vary every time
- Daily completion percentage shown as a simple progress ring or bar

### 5.3 Goals
- List view grouped by status (active / complete)
- Create/edit form: title, category, description, target date, goal_type
  - If `goal_type = exercise_threshold`: exercise picker + target weight/reps inputs
  - If `goal_type = manual`: standard fields only, manually marked complete
- Gold badge/indicator on completed goals

### 5.4 Habits
- List of defined habits, active/inactive toggle
- Create/edit form: title, type (simple/workout), frequency, target, unit,
  days_of_week (if specific_days), optional goal link
- If type = workout: no extra setup needed — exercises are chosen freely each
  session in the workout logging screen (5.5), not attached to the habit itself

### 5.5 Workout logging
- Exercise picker (autocomplete/dropdown from `exercises`, with "add new exercise"
  inline option, per 4.6) — chosen fresh each session since splits vary
- Per-exercise set entry: numeric inputs for weight and reps
  - `inputmode="decimal"` for weight, `inputmode="numeric"` for reps (correct mobile
    keyboard)
  - Quick increment/decrement buttons (-5/+5 weight, -1/+1 reps) so sets can be
    logged with taps between rest periods, not full keyboard entry
  - "+ Add set" clones the previous set's weight as a starting point
- Save creates a `workout_sessions` row + associated `set_entries`
- If launched from a "workout" habit, mark that habit's log as completed on save
  (no pre-fill — just links the resulting session to the habit for that date)

### 5.6 History / Progress
- Per-habit streak/completion history
- Per-exercise charts: max weight over time, volume over time (Recharts)
- Plain list of past workout sessions, expandable to see sets

### 5.7 PWA setup
- `vite-plugin-pwa`, manifest with icons, installable to home screen
- Offline read access is nice-to-have, not required for v1 — writes can require
  connectivity

---

## 6. Explicitly out of scope for v1

- Any Claude API / FastAPI service — no natural language goal entry, no AI summaries
- Push notifications / reminders (defer until core loop is proven; PWA push has iOS
  limitations worth revisiting separately)
- Contribution graph visualization (the green/gold calendar grid) — the underlying
  query (4.2) ships in v1, but the calendar UI itself is v1.5, built once the core
  screens are stable
- Multi-user support, sharing, social features

---

## 7. v2 preview (not in scope now, for context only)

v2 adds a thin FastAPI service alongside Supabase, used only for:
- A weekly scheduled job that pulls the last 7 days from `logs`, `set_entries`,
  `tasks`, sends it to Claude (Haiku — this is a summarization task, not one that
  needs a frontier model) for a progress summary + trend flags (e.g. "water
  tracking dropped to 60% this week")
- Output stored in a new `weekly_summaries` table, surfaced on an Insights tab
- v2 only ever reads from v1 tables and writes to its own new table — no v1 schema
  changes required to support it

---

## 8. Build order

1. Supabase project + schema + RLS policies
2. Auth
3. Habits CRUD + Goals CRUD (manual type only first)
4. Today dashboard (simple habits only, no workouts yet)
5. Exercises + workout logging screen
6. Workout-type habits linked to sessions (no template step needed)
7. Exercise threshold goals + auto-completion logic
8. Streak calculation + display
9. History/progress charts
10. PWA packaging + install flow
11. (v1.5) Contribution graph
