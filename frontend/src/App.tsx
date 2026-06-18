import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignIn } from './pages/SignIn'
import { SignUp } from './pages/SignUp'
import { Today } from './pages/Today'
import { Habits } from './pages/Habits'
import { Goals } from './pages/Goals'
import { ProtectedRoute } from './components/ProtectedRoute'

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={<Protected><Today /></Protected>} />
        <Route path="/habits" element={<Protected><Habits /></Protected>} />
        <Route path="/goals" element={<Protected><Goals /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
