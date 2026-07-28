import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from './pages/AuthPage'
import { BoardPage } from './pages/BoardPage'
import { ResumePage } from './pages/ResumePage'
import { ResumesPage } from './pages/ResumesPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfilePage } from './pages/ProfilePage'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<BoardPage />} />
            {/* Matches is disabled for now — job agent UI will return later */}
            <Route path="/matches" element={<Navigate to="/" replace />} />
            <Route path="/resumes" element={<ResumesPage />} />
            <Route path="/resume/:id" element={<ResumePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
