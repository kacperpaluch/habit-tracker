import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, ReferenceLine,
} from 'recharts'
import { Flame, Target, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Activity } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { habitsApi, statsApi } from '../api/habits'
import Heatmap from '../components/Heatmap'

function momentumColor(m: number) {
  if (m > 0) return 'text-green-600 dark:text-green-400'
  if (m < 0) return 'text-red-500 dark:text-red-400'
  return 'text-gray-400'
}

export default function StatsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedHabit, setSelectedHabit] = useState<number | null>(null)
  const [momentumDays, setMomentumDays] = useState(90)

  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: habitsApi.list })

  const { data: heatmap = [] } = useQuery({
    queryKey: ['heatmap', year, selectedHabit],
    queryFn: () => selectedHabit ? statsApi.habitHeatmap(selectedHabit, year) : statsApi.heatmap(year),
  })

  const { data: allStats = [] } = useQuery({
    queryKey: ['all-stats'],
    queryFn: statsApi.allStats,
    enabled: habits.length > 0,
  })

  const { data: momentumHistory = [] } = useQuery({
    queryKey: ['momentum-history', selectedHabit, momentumDays],
    queryFn: () => statsApi.momentumHistory(selectedHabit!, momentumDays),
    enabled: !!selectedHabit,
  })

  const chartData = allStats.map(s => ({
    name: s.habit_name.length > 15 ? s.habit_name.slice(0, 12) + '…' : s.habit_name,
    completions: s.total_completions,
  }))

  const selectedHabitName = habits.find(h => h.id === selectedHabit)?.name

  const momentumMin = momentumHistory.length ? Math.min(...momentumHistory.map(p => p.momentum)) : 0
  const momentumMax = momentumHistory.length ? Math.max(...momentumHistory.map(p => p.momentum)) : 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Statystyki</h1>

      {/* Streak + momentum cards */}
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

            {/* Streak */}
            <div className="flex items-center gap-1.5">
              <Flame size={16} className="text-orange-500 flex-shrink-0" />
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.current_streak}</span>
              <span className="text-xs text-gray-400 self-end pb-0.5">dni</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Rekord: {s.longest_streak}</p>

            {/* Completion rates */}
            <div className="mt-2 flex gap-2 text-xs text-gray-500">
              <span>7d: <strong>{s.completion_rate_week}%</strong></span>
              <span>30d: <strong>{s.completion_rate_month}%</strong></span>
            </div>

            {/* Momentum */}
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
              {s.momentum >= 0
                ? <TrendingUp size={13} className="text-green-500 flex-shrink-0" />
                : <TrendingDown size={13} className="text-red-400 flex-shrink-0" />
              }
              <span className={`text-sm font-bold ${momentumColor(s.momentum)}`}>
                {s.momentum > 0 ? '+' : ''}{s.momentum}
              </span>
              <span className="text-xs text-gray-400">rytm</span>
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Aktywność {selectedHabit ? `— ${selectedHabitName}` : '— wszystkie'}
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
          <div className="w-4 h-4 rounded-sm bg-gray-200 dark:bg-gray-700" />
          <div className="w-4 h-4 rounded-sm bg-primary-200 dark:bg-primary-900" />
          <div className="w-4 h-4 rounded-sm bg-primary-300 dark:bg-primary-700" />
          <div className="w-4 h-4 rounded-sm bg-primary-500" />
          <div className="w-4 h-4 rounded-sm bg-primary-700 dark:bg-primary-400" />
          <span className="text-xs text-gray-400">Więcej</span>
        </div>
      </div>

      {/* Momentum trend — only when habit selected */}
      {selectedHabit && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity size={18} className="text-primary-500" />
              Trend rytmu — {selectedHabitName}
            </h2>
            <div className="flex gap-1">
              {([30, 90, 180] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setMomentumDays(d)}
                  className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                    momentumDays === d
                      ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Legend explanation */}
          <p className="text-xs text-gray-400 mb-4">
            Każdy kolejny wykonany dzień dodaje coraz więcej punktów (+1, +2, +3…); każde pominięcie odejmuje (-1, -2, -3…)
          </p>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={momentumHistory} margin={{ top: 5, right: 8, bottom: 25, left: 8 }}>
              <defs>
                <linearGradient id="momentumPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                interval={Math.floor(momentumHistory.length / 6)}
                tickFormatter={v => format(new Date(v + 'T00:00:00'), 'd MMM', { locale: pl })}
                angle={-30}
                textAnchor="end"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={32}
                domain={[Math.min(momentumMin - 2, -5), Math.max(momentumMax + 2, 5)]}
              />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(value: number) => [value > 0 ? `+${value}` : String(value), 'Rytm']}
                labelFormatter={l => format(new Date(l + 'T00:00:00'), 'd MMMM yyyy', { locale: pl })}
              />
              <Area
                type="monotone"
                dataKey="momentum"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#momentumPos)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Current momentum callout */}
          {momentumHistory.length > 0 && (() => {
            const current = momentumHistory[momentumHistory.length - 1].momentum
            return (
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Aktualny rytm:</span>
                <span className={`font-bold text-lg ${momentumColor(current)}`}>
                  {current > 0 ? '+' : ''}{current}
                </span>
                {current > 0 && (
                  <span className="text-xs text-gray-400">
                    · kolejny dzień wykona da +{momentumHistory.filter(p => p.momentum === current).length + 1}
                  </span>
                )}
              </div>
            )
          })()}
        </div>
      )}

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
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Rekord</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">7 dni</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">30 dni</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Rytm</th>
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
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${momentumColor(s.momentum)}`}>
                        {s.momentum > 0 ? '+' : ''}{s.momentum}
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
