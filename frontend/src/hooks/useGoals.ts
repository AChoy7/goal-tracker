import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types'

export type Goal = Tables<'goals'>

async function currentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  return user!.id
}

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<TablesInsert<'goals'>, 'user_id'>) => {
      const user_id = await currentUserId()
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...values, user_id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: TablesUpdate<'goals'> & { id: string }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}
