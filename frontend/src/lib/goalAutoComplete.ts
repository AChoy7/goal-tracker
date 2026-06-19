import { supabase } from './supabase'

/**
 * When a habit log or task linked to a goal is unchecked, reopen the goal if
 * it was auto-completed. Guards with .eq('status','complete') so active/abandoned
 * goals are never touched. Returns true if a goal was actually reopened.
 */
export async function checkGoalReopen(goalId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('goals')
    .update({ status: 'active', completed_at: null })
    .eq('id', goalId)
    .eq('status', 'complete')
    .select('id')
  if (error) return false
  return (data?.length ?? 0) > 0
}

/**
 * After completing a habit log or task, call this to check whether all habits
 * (today's logs) and tasks linked to the goal are now done. If so, marks the
 * goal complete automatically.
 *
 * Returns true if the goal was auto-completed.
 */
export async function checkGoalAutoComplete(
  goalId: string,
  date: string,
): Promise<boolean> {
  // Fetch active habits linked to this goal
  const { data: habits } = await supabase
    .from('habits')
    .select('id')
    .eq('goal_id', goalId)
    .eq('active', true)

  const habitIds = (habits ?? []).map(h => h.id)

  // Fetch today's logs for those habits
  const { data: logs } = habitIds.length > 0
    ? await supabase
        .from('logs')
        .select('habit_id, completed')
        .in('habit_id', habitIds)
        .eq('date', date)
    : { data: [] }

  const completedHabitIds = new Set(
    (logs ?? []).filter(l => l.completed).map(l => l.habit_id),
  )
  const allHabitsDone = habitIds.every(id => completedHabitIds.has(id))

  // Fetch tasks linked to this goal
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, completed')
    .eq('goal_id', goalId)

  const allTasksDone = (tasks ?? []).every(t => t.completed)

  // Require at least one linked item; all must be done
  const hasLinkedItems = habitIds.length > 0 || (tasks ?? []).length > 0
  if (!hasLinkedItems || !allHabitsDone || !allTasksDone) return false

  const { error } = await supabase
    .from('goals')
    .update({ status: 'complete', completed_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('status', 'active')

  return !error
}
