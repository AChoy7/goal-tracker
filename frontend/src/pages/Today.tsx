import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import {
  useTodayHabits,
  useUpsertLog,
  isExpectedToday,
  type Habit,
  type Log,
} from '../hooks/useTodayHabits'

function toDateStr(d: Date) {
  // Local date in YYYY-MM-DD, not UTC
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

export function Today() {
  const today = new Date()
  const date = toDateStr(today)
  const dayOfWeek = today.getDay()

  const { data, isLoading } = useTodayHabits(date)
  const upsert = useUpsertLog(date)

  const allHabits = data?.habits ?? []
  const allLogs = data?.logs ?? []

  const expected = allHabits.filter(h => isExpectedToday(h, dayOfWeek))
  const logsMap: Record<string, Log> = Object.fromEntries(allLogs.map(l => [l.habit_id, l]))

  const completedCount = expected.filter(h => logsMap[h.id]?.completed).length
  const pct = expected.length > 0 ? Math.round((completedCount / expected.length) * 100) : 0

  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  function toggleBoolean(habit: Habit) {
    const completed = !logsMap[habit.id]?.completed
    upsert.mutate({ habit_id: habit.id, goal_id: habit.goal_id, completed, value: completed ? 1 : 0 })
  }

  function setNumeric(habit: Habit, newValue: number) {
    const value = Math.max(0, newValue)
    upsert.mutate({ habit_id: habit.id, goal_id: habit.goal_id, completed: value >= habit.target, value })
  }

  return (
    <Layout>
      <div className="px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-[var(--text-h)]">Today</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-[var(--text)] hover:text-[var(--text-h)] transition-colors"
          >
            Sign out
          </button>
        </div>
        <p className="text-sm text-[var(--text)] mb-5">{dateLabel}</p>

        {/* Progress */}
        {!isLoading && expected.length > 0 && (
          <div className="mb-7">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm text-[var(--text)]">
                {completedCount} of {expected.length} complete
              </span>
              <span className="text-sm font-semibold text-[var(--text-h)]">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Habit list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="size-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          </div>
        ) : expected.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-[var(--text)] text-sm">No habits scheduled for today.</p>
            <Link to="/habits" className="block text-sm text-[var(--accent)] hover:underline">
              Set up habits →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {expected.map(habit => (
              <HabitRow
                key={habit.id}
                habit={habit}
                log={logsMap[habit.id] ?? null}
                onToggle={toggleBoolean}
                onSetNumeric={setNumeric}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

function HabitRow({
  habit,
  log,
  onToggle,
  onSetNumeric,
}: {
  habit: Habit
  log: Log | null
  onToggle: (h: Habit) => void
  onSetNumeric: (h: Habit, v: number) => void
}) {
  const isBoolean = habit.target <= 1
  const completed = !!log?.completed
  const currentValue = log?.value ?? 0

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
        completed
          ? 'border-[var(--accent-border)] bg-[var(--accent-bg)]'
          : 'border-[var(--border)] bg-[var(--bg)]'
      }`}
    >
      {/* Check circle */}
      <button
        type="button"
        onClick={() =>
          isBoolean
            ? onToggle(habit)
            : onSetNumeric(habit, completed ? 0 : habit.target)
        }
        aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
        className={`shrink-0 size-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          completed
            ? 'bg-[var(--accent)] border-[var(--accent)]'
            : 'border-[var(--border)] hover:border-[var(--accent)]'
        }`}
      >
        {completed && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={2.5}
            className="size-3.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </button>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate transition-colors ${
            completed ? 'text-[var(--text)] line-through' : 'text-[var(--text-h)]'
          }`}
        >
          {habit.title}
        </p>
        {!isBoolean && habit.unit && (
          <p className="text-xs text-[var(--text)] mt-0.5">
            {currentValue} / {habit.target} {habit.unit}
          </p>
        )}
      </div>

      {/* Numeric stepper */}
      {!isBoolean && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onSetNumeric(habit, currentValue - 1)}
            disabled={currentValue <= 0}
            className="size-7 rounded-lg border border-[var(--border)] text-sm text-[var(--text-h)] flex items-center justify-center disabled:opacity-30 hover:border-[var(--accent)] transition-colors"
          >
            −
          </button>
          <span className="w-6 text-center text-sm font-medium tabular-nums text-[var(--text-h)]">
            {currentValue}
          </span>
          <button
            type="button"
            onClick={() => onSetNumeric(habit, currentValue + 1)}
            className="size-7 rounded-lg border border-[var(--border)] text-sm text-[var(--text-h)] flex items-center justify-center hover:border-[var(--accent)] transition-colors"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
