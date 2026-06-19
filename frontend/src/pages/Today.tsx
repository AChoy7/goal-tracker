import { useState, type FormEvent } from 'react'
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
import { useTasks, useCreateTask, useToggleTask, useDeleteTask, type Task } from '../hooks/useTasks'

function toDateStr(d: Date) {
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

  const { data, isLoading, isError } = useTodayHabits(date)
  const upsert = useUpsertLog(date)

  const { data: taskData = [] } = useTasks()
  const createTask = useCreateTask()
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()

  const [newTaskTitle, setNewTaskTitle] = useState('')

  const allHabits = data?.habits ?? []
  const allLogs = data?.logs ?? []

  const expected = allHabits.filter(h => isExpectedToday(h, dayOfWeek))
  const logsMap: Record<string, Log> = Object.fromEntries(allLogs.map(l => [l.habit_id, l]))

  const incompleteTasks = taskData.filter(t => !t.completed)
  const completedTodayTasks = taskData.filter(
    t => t.completed && t.completed_at != null && t.completed_at.slice(0, 10) === date,
  )
  const visibleTasks = [...incompleteTasks, ...completedTodayTasks]

  const completedHabitsCount = expected.filter(h => logsMap[h.id]?.completed).length
  const totalItems = expected.length + visibleTasks.length
  const completedItems = completedHabitsCount + completedTodayTasks.length
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

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

  function handleAddTask(e: FormEvent) {
    e.preventDefault()
    const title = newTaskTitle.trim()
    if (!title) return
    createTask.mutate({ title })
    setNewTaskTitle('')
  }

  return (
    <Layout>
      <div className="px-4 pt-6">
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

        {/* Progress bar */}
        {!isLoading && totalItems > 0 && (
          <div className="mb-7">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm text-[var(--text)]">
                {completedItems} of {totalItems} complete
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="size-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          </div>
        ) : isError ? (
          <div className="text-center py-16">
            <p className="text-red-500 text-sm">Failed to load. Check your connection.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Habits */}
            {expected.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-2.5">
                  Habits
                </p>
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
              </section>
            )}

            {/* Tasks */}
            <section>
              {(expected.length > 0 || visibleTasks.length > 0) && (
                <p className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-2.5">
                  Tasks
                </p>
              )}
              <div className="space-y-2">
                {visibleTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() =>
                      toggleTask.mutate({ id: task.id, completed: !task.completed, goal_id: task.goal_id })
                    }
                    onDelete={() => deleteTask.mutate(task.id)}
                  />
                ))}
                <form onSubmit={handleAddTask}>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="Add a task…"
                    className="w-full px-4 py-3 rounded-xl border border-dashed border-[var(--border)] bg-transparent text-sm text-[var(--text-h)] placeholder:text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </form>
              </div>
            </section>

            {/* Empty state — no habits and no tasks yet */}
            {expected.length === 0 && visibleTasks.length === 0 && (
              <div className="text-center py-10 space-y-3">
                <p className="text-[var(--text)] text-sm">Nothing here yet.</p>
                <Link to="/habits" className="block text-sm text-[var(--accent)] hover:underline">
                  Set up habits →
                </Link>
              </div>
            )}
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
      <button
        type="button"
        onClick={() =>
          isBoolean ? onToggle(habit) : onSetNumeric(habit, completed ? 0 : habit.target)
        }
        aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
        className={`shrink-0 size-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          completed
            ? 'bg-[var(--accent)] border-[var(--accent)]'
            : 'border-[var(--border)] hover:border-[var(--accent)]'
        }`}
      >
        {completed && (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="size-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </button>

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

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
        task.completed
          ? 'border-[var(--accent-border)] bg-[var(--accent-bg)]'
          : 'border-[var(--border)] bg-[var(--bg)]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        className={`shrink-0 size-6 rounded-md border-2 flex items-center justify-center transition-colors ${
          task.completed
            ? 'bg-[var(--accent)] border-[var(--accent)]'
            : 'border-[var(--border)] hover:border-[var(--accent)]'
        }`}
      >
        {task.completed && (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="size-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </button>

      <p
        className={`flex-1 text-sm font-medium truncate transition-colors ${
          task.completed ? 'text-[var(--text)] line-through' : 'text-[var(--text-h)]'
        }`}
      >
        {task.title}
      </p>

      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 text-[var(--text)] hover:text-red-500 transition-colors"
        aria-label="Delete task"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
