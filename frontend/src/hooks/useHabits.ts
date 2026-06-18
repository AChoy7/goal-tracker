import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types'

export type Habit = Tables<'habits'>

async function currentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  return user!.id
}

export function useHabits() {
  return useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useCreateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<TablesInsert<'habits'>, 'user_id'>) => {
      const user_id = await currentUserId()
      const { data, error } = await supabase
        .from('habits')
        .insert({ ...values, user_id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

export function useUpdateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: TablesUpdate<'habits'> & { id: string }) => {
      const { data, error } = await supabase
        .from('habits')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('habits').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}
