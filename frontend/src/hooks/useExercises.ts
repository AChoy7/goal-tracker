import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Tables } from '../lib/database.types'

export type Exercise = Tables<'exercises'>

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user!.id
}

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, category, unit }: {
      name: string
      category?: string | null
      unit?: string
    }) => {
      const user_id = await currentUserId()
      const { data, error } = await supabase
        .from('exercises')
        .insert({ name, category: category ?? null, unit: unit ?? 'lbs', user_id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })
}
