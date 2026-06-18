import { useState, type FormEvent } from 'react'
import { Layout } from '../components/Layout'
import { Sheet } from '../components/Sheet'
import { useHabits, useCreateHabit, useUpdateHabit, useDeleteHabit, type Habit } from '../hooks/useHabits'
import { useGoals } from '../hooks/useGoals'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type HabitFormValues = {
  title: string
  habit_type: 'simple' | 'workout'
  frequency: 'daily' | 'weekly' | 'specific_days'
  days_of_week: number[]
  target: number
  unit: string
  goal_id: string
}

const DEFAULT_FORM: HabitFormValues = {
  title: '',
  habit_type: 'simple',
  frequency: 'daily',
  days_of_week: [],
  target: 1,
  unit: '',
  goal_id: '',
}

function habitToForm(h: Habit): HabitFormValues {
  return {
    title: h.title,
    habit_type: h.habit_type as 'simple' | 'workout',
    frequency: h.frequency as 'daily' | 'weekly' | 'specific_days',
    days_of_week: h.days_of_week ?? [],
    target: h.target,
    unit: h.unit ?? '',
    goal_id: h.goal_id ?? '',
  }
}

function frequencyLabel(h: Habit) {
  if (h.frequency === 'daily') return 'Daily'
  if (h.frequency === 'weekly') return 'Weekly'
  const days = (h.days_of_week ?? []).map(d => DAY_LABELS[d]).join(' ')
  return days || 'Specific days'
}

const inputCls = 'block w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-h)] placeholder:text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]'
const labelCls = 'block text-sm font-medium text-[var(--text-h)] mb-1.5'

export function Habits() {
  const { data: habits = [], isLoading } = useHabits()
  const { data: goals = [] } = useGoals()
  const createHabit = useCreateHabit()
  const updateHabit = useUpdateHabit()
  const deleteHabit = useDeleteHabit()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [form, setForm] = useState<HabitFormValues>(DEFAULT_FORM)
  const [error, setError] = useState<string | null>(null)

  const activeGoals = goals.filter(g => g.status === 'active')

  function openCreate() {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setError(null)
    setSheetOpen(true)
  }

  function openEdit(h: Habit) {
    setEditing(h)
    setForm(habitToForm(h))
    setError(null)
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setEditing(null)
  }

  function set<K extends keyof HabitFormValues>(key: K, value: HabitFormValues[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleDay(day: number) {
    setForm(f => {
      const current = f.days_of_week
      return {
        ...f,
        days_of_week: current.includes(day)
          ? current.filter(d => d !== day)
          : [...current, day].sort((a, b) => a - b),
      }
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const values = {
      title: form.title.trim(),
      habit_type: form.habit_type,
      frequency: form.frequency,
      days_of_week: form.frequency === 'specific_days' ? form.days_of_week : null,
      target: form.habit_type === 'workout' ? 1 : form.target,
      unit: form.habit_type === 'workout' ? null : form.unit.trim() || null,
      goal_id: form.goal_id || null,
    }
    try {
      if (editing) {
        await updateHabit.mutateAsync({ id: editing.id, ...values })
      } else {
        await createHabit.mutateAsync(values)
      }
      closeSheet()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  async function handleToggleActive(h: Habit, e: React.MouseEvent) {
    e.stopPropagation()
    await updateHabit.mutateAsync({ id: h.id, active: !h.active })
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm(`Delete "${editing.title}"?`)) return
    await deleteHabit.mutateAsync(editing.id)
    closeSheet()
  }

  const isPending = createHabit.isPending || updateHabit.isPending

  const active = habits.filter(h => h.active)
  const inactive = habits.filter(h => !h.active)

  return (
    <Layout>
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-h)]">Habits</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New habit
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="size-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[var(--text)] text-sm">No habits yet.</p>
            <button onClick={openCreate} className="mt-3 text-sm text-[var(--accent)] hover:underline">
              Create your first habit
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map(h => <HabitRow key={h.id} habit={h} onEdit={openEdit} onToggle={handleToggleActive} />)}
            {inactive.length > 0 && (
              <>
                <p className="text-xs font-medium text-[var(--text)] pt-4 pb-1 uppercase tracking-wide">Inactive</p>
                {inactive.map(h => <HabitRow key={h.id} habit={h} onEdit={openEdit} onToggle={handleToggleActive} />)}
              </>
            )}
          </div>
        )}
      </div>

      <Sheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editing ? 'Edit habit' : 'New habit'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="title" className={labelCls}>Title</label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              required
              placeholder="e.g. Drink water"
              className={inputCls}
            />
          </div>

          {/* Type */}
          <div>
            <p className={labelCls}>Type</p>
            <div className="flex gap-2">
              {(['simple', 'workout'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('habit_type', t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.habit_type === t
                      ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text)]'
                  }`}
                >
                  {t === 'simple' ? 'Simple' : 'Workout'}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <p className={labelCls}>Frequency</p>
            <div className="flex gap-2 flex-wrap">
              {(['daily', 'weekly', 'specific_days'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => set('frequency', f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.frequency === f
                      ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text)]'
                  }`}
                >
                  {f === 'specific_days' ? 'Specific days' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Days of week */}
          {form.frequency === 'specific_days' && (
            <div>
              <p className={labelCls}>Days</p>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      form.days_of_week.includes(i)
                        ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Target + unit — only for simple habits */}
          {form.habit_type === 'simple' && (
            <div className="flex gap-3">
              <div className="w-24">
                <label htmlFor="target" className={labelCls}>Target</label>
                <input
                  id="target"
                  type="number"
                  min={1}
                  value={form.target}
                  onChange={e => set('target', Number(e.target.value))}
                  className={inputCls}
                  inputMode="numeric"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="unit" className={labelCls}>Unit (optional)</label>
                <input
                  id="unit"
                  type="text"
                  value={form.unit}
                  onChange={e => set('unit', e.target.value)}
                  placeholder="cups, minutes…"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* Goal link */}
          {activeGoals.length > 0 && (
            <div>
              <label htmlFor="goal_id" className={labelCls}>Link to goal (optional)</label>
              <select
                id="goal_id"
                value={form.goal_id}
                onChange={e => set('goal_id', e.target.value)}
                className={inputCls}
              >
                <option value="">None</option>
                {activeGoals.map(g => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            {editing && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {isPending ? 'Saving…' : editing ? 'Save changes' : 'Create habit'}
            </button>
          </div>
        </form>
      </Sheet>
    </Layout>
  )
}

function HabitRow({
  habit,
  onEdit,
  onToggle,
}: {
  habit: Habit
  onEdit: (h: Habit) => void
  onToggle: (h: Habit, e: React.MouseEvent) => void
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] cursor-pointer hover:border-[var(--accent-border)] transition-colors"
      onClick={() => onEdit(habit)}
    >
      {/* Active toggle */}
      <button
        type="button"
        onClick={e => onToggle(habit, e)}
        aria-label={habit.active ? 'Deactivate' : 'Activate'}
        className={`shrink-0 w-10 h-6 rounded-full border-2 transition-colors relative ${
          habit.active
            ? 'bg-[var(--accent)] border-[var(--accent)]'
            : 'bg-transparent border-[var(--border)]'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            habit.active ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${habit.active ? 'text-[var(--text-h)]' : 'text-[var(--text)]'}`}>
          {habit.title}
        </p>
        <p className="text-xs text-[var(--text)] mt-0.5">
          {habit.habit_type === 'workout' ? 'Workout' : 'Simple'} · {frequencyLabel(habit)}
          {habit.habit_type === 'simple' && habit.unit
            ? ` · ${habit.target} ${habit.unit}`
            : null}
        </p>
      </div>

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4 text-[var(--text)] shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </div>
  )
}
