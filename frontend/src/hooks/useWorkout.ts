import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user!.id
}

export type SetInput = {
  exercise_id: string
  set_number: number
  weight: number | null
  reps: number | null
}

export function useSaveWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      date,
      session_type,
      notes,
      habit_id,
      sets,
    }: {
      date: string
      session_type?: string | null
      notes?: string | null
      habit_id?: string | null
      sets: SetInput[]
    }) => {
      const user_id = await currentUserId()

      const { data: session, error: sErr } = await supabase
        .from('workout_sessions')
        .insert({ date, session_type: session_type ?? null, notes: notes ?? null, habit_id: habit_id ?? null, user_id })
        .select()
        .single()
      if (sErr) throw sErr

      if (sets.length > 0) {
        const { error: eErr } = await supabase
          .from('set_entries')
          .insert(sets.map(s => ({ ...s, session_id: session.id })))
        if (eErr) throw eErr
      }

      if (habit_id) {
        const { error: lErr } = await supabase
          .from('logs')
          .upsert(
            { habit_id, date, completed: true, value: 1, user_id },
            { onConflict: 'habit_id,date' },
          )
        if (lErr) throw lErr
      }

      return session
    },
    onSuccess: (_, vars) => {
      if (vars.habit_id) {
        qc.invalidateQueries({ queryKey: ['today', vars.date] })
      }
    },
  })
}
