import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useExercises, useCreateExercise, type Exercise } from '../hooks/useExercises'
import { useSaveWorkout, type SetInput } from '../hooks/useWorkout'

type SetDraft = { weight: string; reps: string }
type BlockState = {
  key: string
  exercise_id: string | null
  exercise_name: string
  sets: SetDraft[]
}

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

export function WorkoutLog() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const habitId = searchParams.get('habitId')
  const dateParam = searchParams.get('date') ?? toDateStr(new Date())

  const { data: exercises = [] } = useExercises()
  const createExercise = useCreateExercise()
  const saveWorkout = useSaveWorkout()

  const [sessionType, setSessionType] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [blocks, setBlocks] = useState<BlockState[]>([newBlock()])

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

  async function handleSave() {
    const sets: SetInput[] = []
    for (const block of blocks) {
      if (!block.exercise_id) continue
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
      date: dateParam,
      session_type: sessionType,
      notes: notes.trim() || null,
      habit_id: habitId ?? null,
      sets,
    })
    navigate(-1)
  }

  return (
    <div className="min-h-svh bg-[var(--bg)] flex flex-col">
      <header className="flex items-center px-4 pt-12 pb-3 border-b border-[var(--border)] shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-medium text-[var(--accent)] w-14"
        >
          ← Back
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-[var(--text-h)]">
          Log Workout
        </h1>
        <div className="w-14" />
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          {/* Session type */}
          <div className="flex gap-2">
            {(['lift', 'plyo', 'conditioning'] as const).map(t => (
              <button
                key={t}
                onClick={() => setSessionType(p => p === t ? null : t)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border capitalize transition-colors ${
                  sessionType === t
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                    : 'border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Exercise blocks */}
          {blocks.map(block => (
            <ExerciseCard
              key={block.key}
              block={block}
              exercises={exercises}
              onUpdate={patch => patchBlock(block.key, patch)}
              onAddSet={() => addSet(block.key)}
              onUpdateSet={(i, patch) => updateSet(block.key, i, patch)}
              onRemoveSet={i => removeSet(block.key, i)}
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
        </div>
      </div>

      <div className="shrink-0 px-4 pb-8 pt-3 border-t border-[var(--border)]">
        {saveWorkout.isError && (
          <p className="text-red-500 text-xs text-center mb-2">Failed to save. Please try again.</p>
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
  )
}

function ExerciseCard({
  block,
  exercises,
  onUpdate,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onCreateExercise,
}: {
  block: BlockState
  exercises: Exercise[]
  onUpdate: (patch: Partial<BlockState>) => void
  onAddSet: () => void
  onUpdateSet: (idx: number, patch: Partial<SetDraft>) => void
  onRemoveSet: (idx: number) => void
  onCreateExercise: (name: string) => Promise<void>
}) {
  return (
    <div className="rounded-xl border border-[var(--border)]">
      <ExercisePicker
        value={block.exercise_name}
        exercises={exercises}
        onSelect={ex => onUpdate({ exercise_id: ex.id, exercise_name: ex.name })}
        onCreateNew={onCreateExercise}
      />
      <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
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
    : exercises.slice(0, 6)
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
    <div className="flex items-center gap-2 px-3 py-2.5">
      <span className="text-xs text-[var(--text)] w-5 text-center shrink-0">{setNum}</span>

      {/* Weight */}
      <div className="flex items-center gap-1 flex-1">
        <button
          type="button"
          onClick={() => onChange({ weight: String(Math.max(0, w - 5)) })}
          className="h-7 w-9 rounded-md border border-[var(--border)] text-xs font-medium text-[var(--text-h)] hover:border-[var(--accent)] transition-colors shrink-0"
        >
          −5
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={set.weight}
          onChange={e => onChange({ weight: e.target.value })}
          placeholder="0"
          className="flex-1 min-w-0 text-center text-sm text-[var(--text-h)] bg-transparent focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onChange({ weight: String(w + 5) })}
          className="h-7 w-9 rounded-md border border-[var(--border)] text-xs font-medium text-[var(--text-h)] hover:border-[var(--accent)] transition-colors shrink-0"
        >
          +5
        </button>
        <span className="text-xs text-[var(--text)] shrink-0 w-6">lbs</span>
      </div>

      <span className="text-[var(--text)] text-sm shrink-0">×</span>

      {/* Reps */}
      <div className="flex items-center gap-1 flex-1">
        <button
          type="button"
          onClick={() => onChange({ reps: String(Math.max(0, r - 1)) })}
          className="h-7 w-9 rounded-md border border-[var(--border)] text-xs font-medium text-[var(--text-h)] hover:border-[var(--accent)] transition-colors shrink-0"
        >
          −1
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={set.reps}
          onChange={e => onChange({ reps: e.target.value })}
          placeholder="0"
          className="flex-1 min-w-0 text-center text-sm text-[var(--text-h)] bg-transparent focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onChange({ reps: String(r + 1) })}
          className="h-7 w-9 rounded-md border border-[var(--border)] text-xs font-medium text-[var(--text-h)] hover:border-[var(--accent)] transition-colors shrink-0"
        >
          +1
        </button>
        <span className="text-xs text-[var(--text)] shrink-0 w-8">reps</span>
      </div>

      <div className="w-5 shrink-0 flex items-center justify-center">
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[var(--text)] hover:text-red-500 transition-colors text-xl leading-none"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
