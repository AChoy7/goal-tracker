import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export function SignUp() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setSubmitting(true)
    setError(null)

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }
    // session is null when email confirmation is required
    if (data.user && !data.session) {
      setNeedsConfirmation(true)
      setSubmitting(false)
    }
    // If session exists, onAuthStateChange fires → Navigate above redirects
  }

  if (needsConfirmation) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-[var(--bg)] p-4">
        <div className="w-full max-w-sm text-center">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-8 shadow-sm">
            <div className="mb-4 text-4xl">✉️</div>
            <h2 className="text-lg font-semibold text-[var(--text-h)]">Check your email</h2>
            <p className="mt-2 text-sm text-[var(--text)]">
              We sent a confirmation link to <strong className="text-[var(--text-h)]">{email}</strong>.
              Click it to activate your account.
            </p>
            <Link
              to="/signin"
              className="mt-6 inline-block text-sm text-[var(--accent)] hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
            Goal Tracker
          </h1>
          <p className="mt-1 text-sm text-[var(--text)]">Create your account</p>
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
                autoComplete="new-password"
                className="block w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-h)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--text-h)]" htmlFor="confirm">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
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
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--text)]">
            Already have an account?{' '}
            <Link to="/signin" className="text-[var(--accent)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
