# Project context for Claude Code

See docs/SPEC.md for full schema and feature spec.

Stack: React + Vite + Tailwind v4 (via @tailwindcss/vite plugin, no config file),
TypeScript, Supabase (Postgres + Auth), TanStack Query, Recharts.
Typed Supabase client lives in frontend/src/lib/supabase.ts, generated types in
frontend/src/lib/database.types.ts — regenerate after any schema change with
`npx supabase gen types typescript --linked > frontend/src/lib/database.types.ts`.

No FastAPI/Claude API in this phase — v1 is fully deterministic.
Follow the build order in SPEC.md section 8 unless told otherwise.