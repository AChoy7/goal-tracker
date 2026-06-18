import { useState, type FormEvent } from 'react'
import { Layout } from '../components/Layout'
import { Sheet } from '../components/Sheet'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, type Goal } from '../hooks/useGoals'

const CATEGORIES = ['soccer', 'project', 'personal'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_LABELS: Record<Category, string> = {
  soccer: 'Soccer',
  project: 'Project',
  personal: 'Personal',
}

type GoalFormValues = {
  title: string
  category: string
  description: string
  target_date: string
}

const DEFAULT_FORM: GoalFormValues = {
  title: '',
  category: '',
  description: '',
  target_date: '',
}

function goalToForm(g: Goal): GoalFormValues {
  return {
    title: g.title,
    category: g.category ?? '',
    description: g.description ?? '',
    target_date: g.target_date ?? '',
  }
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const inputCls = 'block w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-h)] placeholder:text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]'
const labelCls = 'block text-sm font-medium text-[var(--text-h)] mb-1.5'

export function Goals() {
  const { data: goals = [], isLoading } = useGoals()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [form, setForm] = useState<GoalFormValues>(DEFAULT_FORM)
  const [error, setError] = useState<string | null>(null)

  const active = goals.filter(g => g.status === 'active')
  const complete = goals.filter(g => g.status === 'complete')
  const abandoned = goals.filter(g => g.status === 'abandoned')

  function openCreate() {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setError(null)
    setSheetOpen(true)
  }

  function openEdit(g: Goal) {
    setEditing(g)
    setForm(goalToForm(g))
    setError(null)
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setEditing(null)
  }

  function set<K extends keyof GoalFormValues>(key: K, value: GoalFormValues[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const values = {
      title: form.title.trim(),
      category: form.category || null,
      description: form.description.trim() || null,
      target_date: form.target_date || null,
      goal_type: 'manual' as const,
    }
    try {
      if (editing) {
        await updateGoal.mutateAsync({ id: editing.id, ...values })
      } else {
        await createGoal.mutateAsync({ ...values, status: 'active' })
      }
      closeSheet()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  async function handleMarkComplete(g: Goal, e: React.MouseEvent) {
    e.stopPropagation()
    await updateGoal.mutateAsync({
      id: g.id,
      status: 'complete',
      completed_at: new Date().toISOString(),
    })
  }

  async function handleReopen(g: Goal, e: React.MouseEvent) {
    e.stopPropagation()
    await updateGoal.mutateAsync({ id: g.id, status: 'active', completed_at: null })
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm(`Delete "${editing.title}"?`)) return
    await deleteGoal.mutateAsync(editing.id)
    closeSheet()
  }

  const isPending = createGoal.isPending || updateGoal.isPending

  return (
    <Layout>
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-h)]">Goals</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New goal
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="size-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[var(--text)] text-sm">No goals yet.</p>
            <button onClick={openCreate} className="mt-3 text-sm text-[var(--accent)] hover:underline">
              Set your first goal
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {active.length > 0 && (
              <section>
                <p className="text-xs font-medium text-[var(--text)] uppercase tracking-wide mb-2">Active</p>
                <div className="space-y-2">
                  {active.map(g => (
                    <GoalRow
                      key={g.id}
                      goal={g}
                      onEdit={openEdit}
                      onComplete={handleMarkComplete}
                    />
                  ))}
                </div>
              </section>
            )}

            {complete.length > 0 && (
              <section>
                <p className="text-xs font-medium text-[var(--text)] uppercase tracking-wide mb-2">Completed</p>
                <div className="space-y-2">
                  {complete.map(g => (
                    <GoalRow
                      key={g.id}
                      goal={g}
                      onEdit={openEdit}
                      onReopen={handleReopen}
                    />
                  ))}
                </div>
              </section>
            )}

            {abandoned.length > 0 && (
              <section>
                <p className="text-xs font-medium text-[var(--text)] uppercase tracking-wide mb-2">Abandoned</p>
                <div className="space-y-2">
                  {abandoned.map(g => (
                    <GoalRow key={g.id} goal={g} onEdit={openEdit} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <Sheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editing ? 'Edit goal' : 'New goal'}
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
              placeholder="e.g. Hit 225 on squat"
              className={inputCls}
            />
          </div>

          {/* Category */}
          <div>
            <p className={labelCls}>Category (optional)</p>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => set('category', '')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.category === ''
                    ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--text)]'
                }`}
              >
                None
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('category', c)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.category === c
                      ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text)]'
                  }`}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={labelCls}>Description (optional)</label>
            <textarea
              id="description"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="Why this goal matters…"
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Target date */}
          <div>
            <label htmlFor="target_date" className={labelCls}>Target date (optional)</label>
            <input
              id="target_date"
              type="date"
              value={form.target_date}
              onChange={e => set('target_date', e.target.value)}
              className={inputCls}
            />
          </div>

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
              {isPending ? 'Saving…' : editing ? 'Save changes' : 'Create goal'}
            </button>
          </div>
        </form>
      </Sheet>
    </Layout>
  )
}

function GoalRow({
  goal,
  onEdit,
  onComplete,
  onReopen,
}: {
  goal: Goal
  onEdit: (g: Goal) => void
  onComplete?: (g: Goal, e: React.MouseEvent) => void
  onReopen?: (g: Goal, e: React.MouseEvent) => void
}) {
  const isComplete = goal.status === 'complete'

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] cursor-pointer hover:border-[var(--accent-border)] transition-colors"
      onClick={() => onEdit(goal)}
    >
      {/* Status indicator */}
      <div
        className={`shrink-0 size-2.5 rounded-full ${
          isComplete ? 'bg-yellow-400' : 'bg-[var(--accent)]'
        }`}
      />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isComplete ? 'text-[var(--text)] line-through' : 'text-[var(--text-h)]'}`}>
          {goal.title}
        </p>
        <p className="text-xs text-[var(--text)] mt-0.5">
          {goal.category ? CATEGORY_LABELS[goal.category as Category] ?? goal.category : null}
          {goal.category && goal.target_date ? ' · ' : null}
          {goal.target_date ? formatDate(goal.target_date) : null}
          {!goal.category && !goal.target_date ? 'No deadline' : null}
        </p>
      </div>

      {/* Quick action */}
      {onComplete && (
        <button
          type="button"
          onClick={e => onComplete(goal, e)}
          className="shrink-0 text-xs font-medium text-[var(--accent)] border border-[var(--accent-border)] rounded-lg px-2.5 py-1 hover:bg-[var(--accent-bg)] transition-colors"
        >
          Done
        </button>
      )}
      {onReopen && (
        <button
          type="button"
          onClick={e => onReopen(goal, e)}
          className="shrink-0 text-xs font-medium text-[var(--text)] border border-[var(--border)] rounded-lg px-2.5 py-1 hover:text-[var(--text-h)] transition-colors"
        >
          Reopen
        </button>
      )}

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4 text-[var(--text)] shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </div>
  )
}
