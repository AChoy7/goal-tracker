import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export function Today() {
  const { user } = useAuth()

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-svh bg-[var(--bg)] p-6">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--text-h)]">Today</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-[var(--text)] hover:text-[var(--text-h)] transition-colors"
          >
            Sign out
          </button>
        </div>
        <p className="mt-2 text-sm text-[var(--text)]">Signed in as {user?.email}</p>
        <p className="mt-8 text-sm text-[var(--text)]">Dashboard coming in step 4.</p>
      </div>
    </div>
  )
}
