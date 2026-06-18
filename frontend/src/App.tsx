import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignIn } from './pages/SignIn'
import { SignUp } from './pages/SignUp'
import { Today } from './pages/Today'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Today />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
