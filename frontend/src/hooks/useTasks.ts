import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { checkGoalAutoComplete, checkGoalReopen } from '../lib/goalAutoComplete'
import type { Tables } from '../lib/database.types'

export type Task = Tables<'tasks'>

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user!.id
}

function todayStr() {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ title, goal_id }: { title: string; goal_id?: string | null }) => {
      const user_id = await currentUserId()
      const { data, error } = await supabase
        .from('tasks')
        .insert({ title, goal_id: goal_id ?? null, user_id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useToggleTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, completed }: {
      id: string
      completed: boolean
      goal_id?: string | null
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ completed, completed_at: completed ? new Date().toISOString() : null })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: async (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      if (vars.goal_id) {
        if (vars.completed) {
          const autoCompleted = await checkGoalAutoComplete(vars.goal_id, todayStr())
          if (autoCompleted) qc.invalidateQueries({ queryKey: ['goals'] })
        } else {
          const reopened = await checkGoalReopen(vars.goal_id)
          if (reopened) qc.invalidateQueries({ queryKey: ['goals'] })
        }
      }
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
