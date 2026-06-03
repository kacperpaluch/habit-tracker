import { useState } from 'react'
import toast from 'react-hot-toast'

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onLogin(username, password)
    } catch {
      toast.error('Nieprawidłowe dane logowania')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 dark:bg-warm-950 px-4">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-50/60 via-transparent to-transparent dark:from-primary-900/20 dark:via-transparent pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl text-stone-900 dark:text-stone-100 mb-1">
            Nawyki
          </h1>
          <p className="text-sm text-stone-400 dark:text-stone-500">
            Zaloguj się, by kontynuować
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-warm-900 rounded-3xl shadow-xl shadow-warm-300/20 dark:shadow-warm-950/60 border border-warm-200 dark:border-warm-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                Użytkownik
              </label>
              <input
                required
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-warm-200 dark:border-warm-800 rounded-2xl bg-warm-50 dark:bg-warm-850 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-primary-400 focus:border-transparent transition placeholder:text-stone-300 dark:placeholder:text-stone-600"
                autoComplete="username"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                Hasło
              </label>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-warm-200 dark:border-warm-800 rounded-2xl bg-warm-50 dark:bg-warm-850 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-primary-400 focus:border-transparent transition placeholder:text-stone-300 dark:placeholder:text-stone-600"
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] disabled:opacity-60 text-white font-semibold rounded-2xl transition-all mt-2 shadow-sm shadow-primary-600/30"
            >
              {loading ? 'Logowanie…' : 'Zaloguj się'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
