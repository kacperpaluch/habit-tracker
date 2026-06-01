import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Flame, Target, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { habitsApi, statsApi } from '../api/habits'
import Heatmap from '../components/Heatmap'

export default function StatsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedHabit, setSelectedHabit] = useState<number | null>(null)

  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: habitsApi.list })
  const { data: heatmap = [] } = useQuery({
    queryKey: ['heatmap', year, selectedHabit],
    queryFn: () => selectedHabit
      ? statsApi.habitHeatmap(selectedHabit, year)
      : statsApi.heatmap(year),
  })

  const statsQueries = useQuery({
    queryKey: ['all-stats', habits.map(h => h.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(habits.map(h => statsApi.habitStats(h.id)))
      return results
    },
    enabled: habits.length > 0,
  })

  const allStats = statsQueries.data ?? []

  // Chart: completions per habit
  const chartData = allStats.map(s => ({
    name: s.habit_name.length > 15 ? s.habit_name.slice(0, 12) + '…' : s.habit_name,
    completions: s.total_completions,
    streak: s.current_streak,
  }))

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Statystyki</h1>

      {/* Streak cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {allStats.map(s => (
          <div
            key={s.habit_id}
            onClick={() => setSelectedHabit(s.habit_id === selectedHabit ? null : s.habit_id)}
            className={`bg-white dark:bg-gray-900 rounded-xl p-4 border cursor-pointer transition-all ${
              selectedHabit === s.habit_id
                ? 'border-primary-400 dark:border-primary-600 shadow-md'
                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">{s.habit_name}</p>
            <div className="flex items-center gap-1.5">
              <Flame size={16} className="text-orange-500 flex-shrink-0" />
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.current_streak}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Najdłuższy: {s.longest_streak}</p>
            <div className="mt-2 flex gap-2 text-xs text-gray-500">
              <span>7d: <strong>{s.completion_rate_week}%</strong></span>
              <span>30d: <strong>{s.completion_rate_month}%</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Aktywność {selectedHabit
              ? `— ${habits.find(h => h.id === selectedHabit)?.name}`
              : '— wszystkie'}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-center">{year}</span>
            <button
              onClick={() => setYear(y => y + 1)}
              disabled={year >= new Date().getFullYear()}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <Heatmap data={heatmap} year={year} />
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-xs text-gray-400">Mniej</span>
          {['bg-gray-100 dark:bg-gray-800', 'bg-primary-200', 'bg-primary-300', 'bg-primary-500', 'bg-primary-700'].map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span className="text-xs text-gray-400">Więcej</span>
        </div>
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-500" />
            Łączne realizacje
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="completions" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary table */}
      {allStats.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 p-5 pb-3 flex items-center gap-2">
            <Target size={18} className="text-primary-500" />
            Podsumowanie nawyków
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-5 py-2.5 font-medium text-gray-600 dark:text-gray-400">Nawyk</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Streak</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Najdłuższy</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Ten tydzień</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Ten miesiąc</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Razem</th>
                </tr>
              </thead>
              <tbody>
                {allStats.map((s, i) => (
                  <tr key={s.habit_id} className={i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/20'}>
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">{s.habit_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-orange-500 font-semibold">
                        <Flame size={13} />{s.current_streak}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{s.longest_streak}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${s.completion_rate_week >= 80 ? 'text-green-600' : s.completion_rate_week >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {s.completion_rate_week}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${s.completion_rate_month >= 80 ? 'text-green-600' : s.completion_rate_month >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {s.completion_rate_month}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{s.total_completions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
