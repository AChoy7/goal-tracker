import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export function SignIn() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setSubmitting(false)
    }
    // On success, onAuthStateChange fires → AuthContext updates → Navigate above redirects
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
            Goal Tracker
          </h1>
          <p className="mt-1 text-sm text-[var(--text)]">Sign in to continue</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--text-h)]" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="block w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-h)] placeholder:text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--text-h)]" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="block w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-h)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--text)]">
            No account?{' '}
            <Link to="/signup" className="text-[var(--accent)] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
