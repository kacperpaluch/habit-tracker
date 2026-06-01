import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import TodayPage from './pages/TodayPage'
import StatsPage from './pages/StatsPage'
import CalendarPage from './pages/CalendarPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const { isAuthenticated, login, logout } = useAuth()
  const [page, setPage] = useState('today')
  useTheme() // init theme on mount

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" />
        <LoginPage onLogin={login} />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Toaster position="top-right" />
      <Navbar page={page} setPage={setPage} onLogout={logout} />
      <main>
        {page === 'today' && <TodayPage />}
        {page === 'stats' && <StatsPage />}
        {page === 'calendar' && <CalendarPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
