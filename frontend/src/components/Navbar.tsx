import { Sun, Moon, Settings, LogOut, LayoutDashboard, BarChart2, Calendar } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import clsx from 'clsx'

interface NavbarProps {
  page: string
  setPage: (p: string) => void
  onLogout: () => void
  authDisabled?: boolean
}

export default function Navbar({ page, setPage, onLogout, authDisabled = false }: NavbarProps) {
  const { dark, toggle } = useTheme()

  const nav = [
    { id: 'today', label: 'Dziś', icon: LayoutDashboard },
    { id: 'stats', label: 'Statystyki', icon: BarChart2 },
    { id: 'calendar', label: 'Kalendarz', icon: Calendar },
    { id: 'settings', label: 'Ustawienia', icon: Settings },
  ]

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        <span className="font-bold text-primary-600 dark:text-primary-400 text-lg tracking-tight mr-2">
          Habits
        </span>

        <nav className="flex gap-1 flex-1">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                page === id
                  ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Przełącz motyw"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {!authDisabled && (
            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Wyloguj"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
