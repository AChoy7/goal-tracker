import { useState, useRef, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { useExercises, useCreateExercise, type Exercise } from '../hooks/useExercises'
import { useSaveWorkout, type SetInput } from '../hooks/useWorkout'

type SetDraft = { weight: string; reps: string }
type BlockState = {
  key: string
  exercise_id: string | null
  exercise_name: string
  sets: SetDraft[]
}

const SESSION_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body']

function toDateStr(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function newBlock(): BlockState {
  return { key: crypto.randomUUID(), exercise_id: null, exercise_name: '', sets: [{ weight: '', reps: '' }] }
}

export function Workout() {
  const today = new Date()
  const date = toDateStr(today)

  const { data: exercises = [] } = useExercises()
  const createExercise = useCreateExercise()
  const saveWorkout = useSaveWorkout()

  const [sessionType, setSessionType] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [blocks, setBlocks] = useState<BlockState[]>([newBlock()])
  const [savedInfo, setSavedInfo] = useState<{ exerciseCount: number; setCount: number } | null>(null)

  const hasAnyExercise = blocks.some(b => b.exercise_id !== null)

  function patchBlock(key: string, patch: Partial<BlockState>) {
    setBlocks(bs => bs.map(b => b.key === key ? { ...b, ...patch } : b))
  }

  function addSet(key: string) {
    setBlocks(bs => bs.map(b => {
      if (b.key !== key) return b
      const last = b.sets[b.sets.length - 1]
      return { ...b, sets: [...b.sets, { weight: last?.weight ?? '', reps: '' }] }
    }))
  }

  function updateSet(key: string, idx: number, patch: Partial<SetDraft>) {
    setBlocks(bs => bs.map(b => {
      if (b.key !== key) return b
      return { ...b, sets: b.sets.map((s, i) => i === idx ? { ...s, ...patch } : s) }
    }))
  }

  function removeSet(key: string, idx: number) {
    setBlocks(bs => bs.map(b => {
      if (b.key !== key || b.sets.length <= 1) return b
      return { ...b, sets: b.sets.filter((_, i) => i !== idx) }
    }))
  }

  function removeBlock(key: string) {
    setBlocks(bs => {
      const remaining = bs.filter(b => b.key !== key)
      return remaining.length > 0 ? remaining : [newBlock()]
    })
  }

  async function handleSave() {
    const sets: SetInput[] = []
    let exerciseCount = 0
    for (const block of blocks) {
      if (!block.exercise_id) continue
      exerciseCount++
      block.sets.forEach((s, i) => {
        sets.push({
          exercise_id: block.exercise_id!,
          set_number: i + 1,
          weight: s.weight ? parseFloat(s.weight) : null,
          reps: s.reps ? parseInt(s.reps, 10) : null,
        })
      })
    }
    await saveWorkout.mutateAsync({
      date,
      session_type: sessionType?.toLowerCase().replace(' ', '_') ?? null,
      notes: notes.trim() || null,
      habit_id: null,
      sets,
    })
    setSavedInfo({ exerciseCount, setCount: sets.length })
  }

  function resetWorkout() {
    setSessionType(null)
    setNotes('')
    setBlocks([newBlock()])
    setSavedInfo(null)
    saveWorkout.reset()
  }

  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  if (savedInfo) {
    return (
      <Layout>
        <div className="px-4 pt-6 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-bg)] flex items-center justify-center mb-5 border-2 border-[var(--accent-border)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-8 text-[var(--accent)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-h)] mb-1">Workout saved</h2>
          <p className="text-sm text-[var(--text)] mb-8">
            {savedInfo.exerciseCount} exercise{savedInfo.exerciseCount !== 1 ? 's' : ''} &middot; {savedInfo.setCount} set{savedInfo.setCount !== 1 ? 's' : ''}
            {sessionType ? ` · ${sessionType}` : ''}
          </p>
          <button
            onClick={resetWorkout}
            className="px-6 py-2.5 rounded-xl border border-[var(--accent)] text-[var(--accent)] text-sm font-semibold hover:bg-[var(--accent-bg)] transition-colors"
          >
            Log another workout
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="px-4 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-[var(--text-h)]">Workout</h1>
        </div>
        <p className="text-sm text-[var(--text)] mb-5">{dateLabel}</p>

        {/* Session type */}
        <div className="flex gap-1.5 flex-wrap mb-6">
          {SESSION_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setSessionType(p => p === t ? null : t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                sessionType === t
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Exercise cards */}
        <div className="space-y-4">
          {blocks.map(block => (
            <ExerciseCard
              key={block.key}
              block={block}
              exercises={exercises}
              onUpdate={patch => patchBlock(block.key, patch)}
              onAddSet={() => addSet(block.key)}
              onUpdateSet={(i, patch) => updateSet(block.key, i, patch)}
              onRemoveSet={i => removeSet(block.key, i)}
              onRemoveBlock={() => removeBlock(block.key)}
              onCreateExercise={async name => {
                const ex = await createExercise.mutateAsync({ name })
                patchBlock(block.key, { exercise_id: ex.id, exercise_name: ex.name })
              }}
            />
          ))}

          <button
            onClick={() => setBlocks(bs => [...bs, newBlock()])}
            className="w-full py-3 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            + Add exercise
          </button>

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Session notes (optional)"
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text-h)] placeholder:text-[var(--text)] focus:outline-none focus:border-[var(--accent)] resize-none"
          />

          {saveWorkout.isError && (
            <p className="text-center text-xs text-red-500">Failed to save. Please try again.</p>
          )}

          <button
            onClick={handleSave}
            disabled={!hasAnyExercise || saveWorkout.isPending}
            className="w-full py-3.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold disabled:opacity-40 transition-opacity active:scale-[0.98]"
          >
            {saveWorkout.isPending ? 'Saving…' : 'Save workout'}
          </button>
        </div>
      </div>
    </Layout>
  )
}

function ExerciseCard({
  block,
  exercises,
  onUpdate,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onRemoveBlock,
  onCreateExercise,
}: {
  block: BlockState
  exercises: Exercise[]
  onUpdate: (patch: Partial<BlockState>) => void
  onAddSet: () => void
  onUpdateSet: (idx: number, patch: Partial<SetDraft>) => void
  onRemoveSet: (idx: number) => void
  onRemoveBlock: () => void
  onCreateExercise: (name: string) => Promise<void>
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-visible">
      {/* Exercise name row */}
      <div className="flex items-center pr-2">
        <div className="flex-1">
          <ExercisePicker
            value={block.exercise_name}
            exercises={exercises}
            onSelect={ex => onUpdate({ exercise_id: ex.id, exercise_name: ex.name })}
            onCreateNew={onCreateExercise}
          />
        </div>
        <button
          type="button"
          onClick={onRemoveBlock}
          className="shrink-0 size-7 flex items-center justify-center text-[var(--text)] hover:text-red-500 transition-colors rounded-lg"
          aria-label="Remove exercise"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-3 pb-1 border-t border-[var(--border)]">
        <span className="w-5 shrink-0" />
        <span className="flex-1 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text)] pt-2">
          Weight
        </span>
        <span className="w-5 shrink-0" />
        <span className="flex-1 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text)] pt-2">
          Reps
        </span>
        <span className="w-7 shrink-0" />
      </div>

      {/* Set rows */}
      <div className="divide-y divide-[var(--border)]">
        {block.sets.map((set, i) => (
          <SetEntryRow
            key={i}
            setNum={i + 1}
            set={set}
            onChange={patch => onUpdateSet(i, patch)}
            onRemove={block.sets.length > 1 ? () => onRemoveSet(i) : undefined}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onAddSet}
        className="w-full px-4 py-2.5 text-left text-sm text-[var(--accent)] border-t border-[var(--border)] hover:bg-[var(--accent-bg)] transition-colors rounded-b-xl"
      >
        + Add set
      </button>
    </div>
  )
}

function ExercisePicker({
  value,
  exercises,
  onSelect,
  onCreateNew,
}: {
  value: string
  exercises: Exercise[]
  onSelect: (ex: Exercise) => void
  onCreateNew: (name: string) => Promise<void>
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  const trimmed = query.trim()
  const filtered = trimmed
    ? exercises.filter(e => e.name.toLowerCase().includes(trimmed.toLowerCase()))
    : exercises.slice(0, 8)
  const hasExact = exercises.some(e => e.name.toLowerCase() === trimmed.toLowerCase())
  const showDropdown = open && (filtered.length > 0 || (trimmed.length > 0 && !hasExact))

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        placeholder="Exercise name"
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-3 text-sm font-semibold text-[var(--text-h)] bg-transparent placeholder:font-normal placeholder:text-[var(--text)] focus:outline-none rounded-t-xl"
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {filtered.map(ex => (
            <button
              key={ex.id}
              onMouseDown={() => { onSelect(ex); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-h)] hover:bg-[var(--accent-bg)] transition-colors flex items-center justify-between"
            >
              <span>{ex.name}</span>
              {ex.category && (
                <span className="text-xs text-[var(--text)] capitalize">{ex.category}</span>
              )}
            </button>
          ))}
          {trimmed && !hasExact && (
            <button
              onMouseDown={async () => {
                if (creating) return
                setCreating(true)
                try { await onCreateNew(trimmed); setOpen(false) }
                finally { setCreating(false) }
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-[var(--accent)] hover:bg-[var(--accent-bg)] transition-colors border-t border-[var(--border)]"
            >
              {creating ? 'Adding…' : `+ Add "${trimmed}" as new exercise`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SetEntryRow({
  setNum,
  set,
  onChange,
  onRemove,
}: {
  setNum: number
  set: SetDraft
  onChange: (patch: Partial<SetDraft>) => void
  onRemove?: () => void
}) {
  const w = parseFloat(set.weight) || 0
  const r = parseInt(set.reps, 10) || 0

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="w-5 text-xs text-center text-[var(--text)] shrink-0 font-medium tabular-nums">
        {setNum}
      </span>

      {/* Weight stepper */}
      <div className="flex items-center gap-1 flex-1">
        <button
          type="button"
          onClick={() => onChange({ weight: String(Math.max(0, w - 5)) })}
          className="h-9 w-10 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-h)] hover:border-[var(--accent)] hover:bg-[var(--accent-bg)] active:scale-95 transition-all shrink-0"
        >
          −5
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={set.weight}
          onChange={e => onChange({ weight: e.target.value })}
          placeholder="0"
          className="flex-1 min-w-0 text-center text-sm font-semibold text-[var(--text-h)] bg-transparent focus:outline-none tabular-nums"
        />
        <button
          type="button"
          onClick={() => onChange({ weight: String(w + 5) })}
          className="h-9 w-10 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-h)] hover:border-[var(--accent)] hover:bg-[var(--accent-bg)] active:scale-95 transition-all shrink-0"
        >
          +5
        </button>
        <span className="text-xs text-[var(--text)] shrink-0 w-6 text-center">lbs</span>
      </div>

      <span className="text-[var(--text)] text-sm shrink-0">×</span>

      {/* Reps stepper */}
      <div className="flex items-center gap-1 flex-1">
        <button
          type="button"
          onClick={() => onChange({ reps: String(Math.max(0, r - 1)) })}
          className="h-9 w-10 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-h)] hover:border-[var(--accent)] hover:bg-[var(--accent-bg)] active:scale-95 transition-all shrink-0"
        >
          −1
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={set.reps}
          onChange={e => onChange({ reps: e.target.value })}
          placeholder="0"
          className="flex-1 min-w-0 text-center text-sm font-semibold text-[var(--text-h)] bg-transparent focus:outline-none tabular-nums"
        />
        <button
          type="button"
          onClick={() => onChange({ reps: String(r + 1) })}
          className="h-9 w-10 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-h)] hover:border-[var(--accent)] hover:bg-[var(--accent-bg)] active:scale-95 transition-all shrink-0"
        >
          +1
        </button>
      </div>

      <div className="w-7 shrink-0 flex items-center justify-center">
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="size-7 flex items-center justify-center text-[var(--text)] hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
            aria-label="Remove set"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
