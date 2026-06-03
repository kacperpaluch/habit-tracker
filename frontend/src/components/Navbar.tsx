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
    { id: 'today',    label: 'Dziś',       icon: LayoutDashboard },
    { id: 'stats',    label: 'Statystyki', icon: BarChart2 },
    { id: 'calendar', label: 'Kalendarz',  icon: Calendar },
    { id: 'settings', label: 'Ustawienia', icon: Settings },
  ]

  return (
    <header className="sticky top-0 z-20 bg-warm-50/90 dark:bg-warm-950/90 backdrop-blur-md border-b border-warm-200 dark:border-warm-800">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Brand */}
        <span className="font-serif text-xl text-stone-900 dark:text-stone-100 tracking-tight shrink-0 mr-1">
          Nawyki
        </span>

        {/* Navigation */}
        <nav className="flex gap-0.5 flex-1">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150',
                page === id
                  ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:bg-warm-100 dark:hover:bg-warm-850/60 hover:text-stone-700 dark:hover:text-stone-200'
              )}
            >
              <Icon size={15} strokeWidth={page === id ? 2.5 : 2} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            className="p-2 rounded-full text-stone-400 dark:text-stone-500 hover:bg-warm-100 dark:hover:bg-warm-800 hover:text-stone-600 dark:hover:text-stone-300 transition-all"
            title="Przełącz motyw"
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {!authDisabled && (
            <button
              onClick={onLogout}
              className="p-2 rounded-full text-stone-400 dark:text-stone-500 hover:bg-warm-100 dark:hover:bg-warm-800 hover:text-stone-600 dark:hover:text-stone-300 transition-all"
              title="Wyloguj"
            >
              <LogOut size={17} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
