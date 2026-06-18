import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { checkGoalAutoComplete } from '../lib/goalAutoComplete'
import type { Tables } from '../lib/database.types'

export type Habit = Tables<'habits'>
export type Log = Tables<'logs'>

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user!.id
}

export function isExpectedToday(habit: Habit, dayOfWeek: number): boolean {
  if (habit.frequency === 'daily') return true
  if (habit.frequency === 'weekly') return true
  return (habit.days_of_week ?? []).includes(dayOfWeek)
}

export function useTodayHabits(date: string) {
  return useQuery({
    queryKey: ['today', date],
    queryFn: async () => {
      const { data: habits, error: hErr } = await supabase
        .from('habits')
        .select('*')
        .eq('active', true)
        .eq('habit_type', 'simple')
        .order('created_at', { ascending: true })
      if (hErr) throw hErr

      const ids = (habits ?? []).map(h => h.id)
      const { data: logs, error: lErr } = ids.length > 0
        ? await supabase.from('logs').select('*').in('habit_id', ids).eq('date', date)
        : { data: [], error: null }
      if (lErr) throw lErr

      return { habits: habits ?? [], logs: logs ?? [] }
    },
  })
}

export function useUpsertLog(date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      habit_id,
      completed,
      value,
    }: {
      habit_id: string
      goal_id?: string | null
      completed: boolean
      value: number | null
    }) => {
      const user_id = await currentUserId()
      const { data, error } = await supabase
        .from('logs')
        .upsert(
          { habit_id, date, completed, value, user_id },
          { onConflict: 'habit_id,date' },
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: async (_, vars) => {
      qc.invalidateQueries({ queryKey: ['today', date] })
      if (vars.completed && vars.goal_id) {
        const autoCompleted = await checkGoalAutoComplete(vars.goal_id, date)
        if (autoCompleted) {
          qc.invalidateQueries({ queryKey: ['goals'] })
        }
      }
    },
  })
}
