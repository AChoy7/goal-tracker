import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/signin" replace />
  }

  return <>{children}</>
}
