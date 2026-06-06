import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, ReferenceLine,
} from 'recharts'
import { Flame, Target, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Activity, Archive, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { habitsApi, statsApi } from '../api/habits'
import Heatmap from '../components/Heatmap'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Habit } from '../types'

function momentumColor(m: number) {
  if (m > 0) return 'text-green-600 dark:text-green-400'
  if (m < 0) return 'text-red-500 dark:text-red-400'
  return 'text-stone-400'
}

export default function StatsPage() {
  const qc = useQueryClient()
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedHabit, setSelectedHabit] = useState<number | null>(null)
  const [momentumDays, setMomentumDays] = useState(90)
  const [showArchive, setShowArchive] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState<Habit | null>(null)

  const { data: habits = [] } = useQuery({
    queryKey: ['habits', showArchive],
    queryFn: () => habitsApi.list(showArchive),
  })

  const activeHabits = useMemo(() => habits.filter(h => h.is_active), [habits])
  const archivedHabits = useMemo(() => showArchive ? habits.filter(h => !h.is_active) : [], [showArchive, habits])

  const { data: heatmap = [] } = useQuery({
    queryKey: ['heatmap', year, selectedHabit],
    queryFn: () => selectedHabit ? statsApi.habitHeatmap(selectedHabit, year) : statsApi.heatmap(year),
  })

  const { data: allStats = [] } = useQuery({
    queryKey: ['all-stats', showArchive],
    queryFn: () => statsApi.allStats(showArchive),
    enabled: habits.length > 0,
  })

  const archivedStats = useMemo(
    () => showArchive ? allStats.filter(s => !activeHabits.some(h => h.id === s.habit_id)) : [],
    [showArchive, allStats, activeHabits]
  )
  const activeStats = useMemo(
    () => showArchive ? archivedStats : allStats,
    [showArchive, allStats, archivedStats]
  )

  const { data: momentumHistory = [] } = useQuery({
    queryKey: ['momentum-history', selectedHabit, momentumDays],
    queryFn: () => statsApi.momentumHistory(selectedHabit!, momentumDays),
    enabled: !!selectedHabit,
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => habitsApi.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['all-stats'] })
      setConfirmRestore(null)
      toast.success('Nawyk przywrócony!')
    },
  })

  const chartData = activeStats.map(s => ({
    name: s.habit_name.length > 15 ? s.habit_name.slice(0, 12) + '…' : s.habit_name,
    completions: s.total_completions,
  }))

  const selectedHabitName = habits.find(h => h.id === selectedHabit)?.name

  const momentumMin = momentumHistory.length ? Math.min(...momentumHistory.map(p => p.momentum)) : 0
  const momentumMax = momentumHistory.length ? Math.max(...momentumHistory.map(p => p.momentum)) : 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-stone-900 dark:text-stone-100">Statystyki</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setShowArchive(false); setSelectedHabit(null) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !showArchive
                ? 'bg-primary-600 text-white'
                : 'text-stone-500 dark:text-stone-400 hover:bg-warm-100 dark:hover:bg-warm-800'
            }`}
          >
            Aktywne
          </button>
          <button
            onClick={() => setShowArchive(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
              showArchive
                ? 'bg-primary-600 text-white'
                : 'text-stone-500 dark:text-stone-400 hover:bg-warm-100 dark:hover:bg-warm-800'
            }`}
          >
            <Archive size={12} />
            Archiwum
          </button>
        </div>
      </div>

      {showArchive && archivedHabits.length > 0 && (
        <p className="text-xs text-stone-400 dark:text-stone-500 -mb-3">
          Dane historyczne zarchiwizowanych nawyków — przywróć, by śledzić na nowo
        </p>
      )}

      {/* Stat cards grid */}
      {activeStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {activeStats.map(s => (
            <div
              key={s.habit_id}
              onClick={() => setSelectedHabit(s.habit_id === selectedHabit ? null : s.habit_id)}
              className={`bg-white dark:bg-warm-900 rounded-2xl p-4 border cursor-pointer transition-all ${
                selectedHabit === s.habit_id
                  ? 'border-primary-400 dark:border-primary-600 shadow-md shadow-primary-200/30 dark:shadow-primary-900/30'
                  : 'border-warm-200 dark:border-warm-800 hover:border-warm-300 dark:hover:border-warm-700 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <p className="text-xs text-stone-400 dark:text-stone-500 truncate font-medium flex-1">{s.habit_name}</p>
                {showArchive && (
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmRestore(archivedHabits.find(h => h.id === s.habit_id)!) }}
                    className="p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/20 text-green-500 transition-colors flex-shrink-0"
                    title="Przywróć"
                  >
                    <RotateCcw size={10} />
                  </button>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <Flame size={14} className="text-orange-500 flex-shrink-0 self-center" />
                <span className="font-serif text-3xl text-stone-900 dark:text-stone-100 leading-none">{s.current_streak}</span>
                <span className="text-xs text-stone-400">dni</span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">Rekord: <span className="font-medium">{s.longest_streak}</span></p>
              <div className="mt-2.5 flex gap-3 text-xs text-stone-500">
                <span>Tydz.: <strong className="text-stone-700 dark:text-stone-300">{s.completion_rate_week}%</strong></span>
                <span>Mies.: <strong className="text-stone-700 dark:text-stone-300">{s.completion_rate_month}%</strong></span>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-warm-100 dark:border-warm-800 flex items-center gap-1.5">
                {s.momentum >= 0
                  ? <TrendingUp size={12} className="text-green-500 flex-shrink-0" />
                  : <TrendingDown size={12} className="text-red-400 flex-shrink-0" />
                }
                <span className={`font-serif text-lg leading-none ${momentumColor(s.momentum)}`}>
                  {s.momentum > 0 ? '+' : ''}{s.momentum}
                </span>
                <span className="text-xs text-stone-400">rytm</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeStats.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <Archive className="mx-auto mb-3 opacity-20" size={40} />
          <p className="text-stone-400 dark:text-stone-500 text-sm">
            {showArchive ? 'Archiwum jest puste' : 'Brak danych'}
          </p>
        </div>
      )}

      {/* Heatmap */}
      {activeStats.length > 0 && (
        <div className="bg-white dark:bg-warm-900 rounded-2xl p-5 border border-warm-200 dark:border-warm-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900 dark:text-stone-100">
              Aktywność {selectedHabit ? `— ${selectedHabitName}` : '— wszystkie'}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setYear(y => y - 1)}
                className="p-1.5 rounded-full hover:bg-warm-100 dark:hover:bg-warm-800 text-stone-400 transition-all"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300 min-w-[3rem] text-center">{year}</span>
              <button
                onClick={() => setYear(y => y + 1)}
                disabled={year >= new Date().getFullYear()}
                className="p-1.5 rounded-full hover:bg-warm-100 dark:hover:bg-warm-800 text-stone-400 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <Heatmap data={heatmap} year={year} />
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-xs text-stone-400">Mniej</span>
            <div className="w-3.5 h-3.5 rounded-sm bg-warm-200 dark:bg-warm-800" />
            <div className="w-3.5 h-3.5 rounded-sm bg-primary-200 dark:bg-primary-900" />
            <div className="w-3.5 h-3.5 rounded-sm bg-primary-300 dark:bg-primary-700" />
            <div className="w-3.5 h-3.5 rounded-sm bg-primary-500" />
            <div className="w-3.5 h-3.5 rounded-sm bg-primary-700 dark:bg-primary-400" />
            <span className="text-xs text-stone-400">Więcej</span>
          </div>
        </div>
      )}

      {/* Momentum trend */}
      {selectedHabit && (
        <div className="bg-white dark:bg-warm-900 rounded-2xl p-5 border border-warm-200 dark:border-warm-800">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Activity size={17} className="text-primary-500" />
              Trend rytmu — {selectedHabitName}
            </h2>
            <div className="flex gap-1 bg-warm-100 dark:bg-warm-850 rounded-full p-0.5">
              {([30, 90, 180] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setMomentumDays(d)}
                  className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all ${
                    momentumDays === d
                      ? 'bg-white dark:bg-warm-800 text-stone-800 dark:text-stone-200 shadow-sm'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-stone-400 mb-4">
            Każdy kolejny wykonany dzień dodaje coraz więcej punktów (+1, +2, +3…); każde pominięcie odejmuje (−1, −2, −3…)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={momentumHistory} margin={{ top: 5, right: 8, bottom: 25, left: 8 }}>
              <defs>
                <linearGradient id="momentumPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ddd0" className="dark:stroke-warm-800" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#a8a29e' }}
                interval={Math.floor(momentumHistory.length / 6)}
                tickFormatter={v => format(new Date(v + 'T00:00:00'), 'd MMM', { locale: pl })}
                angle={-30}
                textAnchor="end"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#a8a29e' }}
                tickLine={false}
                axisLine={false}
                width={32}
                domain={[Math.min(momentumMin - 2, -5), Math.max(momentumMax + 2, 5)]}
              />
              <ReferenceLine y={0} stroke="#d6c9b8" strokeDasharray="4 4" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e8ddd0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                formatter={(value: number) => [value > 0 ? `+${value}` : String(value), 'Rytm']}
                labelFormatter={l => format(new Date(l + 'T00:00:00'), 'd MMMM yyyy', { locale: pl })}
              />
              <Area
                type="monotone"
                dataKey="momentum"
                stroke="#d97706"
                strokeWidth={2}
                fill="url(#momentumPos)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: '#d97706' }}
              />
            </AreaChart>
          </ResponsiveContainer>
          {momentumHistory.length > 0 && (() => {
            const current = momentumHistory[momentumHistory.length - 1].momentum
            return (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-stone-500 dark:text-stone-400">Aktualny rytm:</span>
                <span className={`font-serif text-2xl leading-none ${momentumColor(current)}`}>
                  {current > 0 ? '+' : ''}{current}
                </span>
                {current > 0 && (
                  <span className="text-xs text-stone-400">
                    · każdy kolejny wykonany dzień dokłada coraz więcej
                  </span>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-warm-900 rounded-2xl p-5 border border-warm-200 dark:border-warm-800">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
            <TrendingUp size={17} className="text-primary-500" />
            Łączne realizacje
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ddd0" className="dark:stroke-warm-800" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a8a29e' }} angle={-35} textAnchor="end" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e8ddd0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <Bar dataKey="completions" fill="#d97706" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary table */}
      {activeStats.length > 0 && (
        <div className="bg-white dark:bg-warm-900 rounded-2xl border border-warm-200 dark:border-warm-800 overflow-hidden">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100 p-5 pb-3 flex items-center gap-2">
            <Target size={17} className="text-primary-500" />
            Podsumowanie nawyków
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-warm-50 dark:bg-warm-850">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Nawyk</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Streak</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Rekord</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Tydzień</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Miesiąc</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Rytm</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Razem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100 dark:divide-warm-800">
                {activeStats.map(s => (
                  <tr key={s.habit_id} className="hover:bg-warm-50/50 dark:hover:bg-warm-850/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-stone-900 dark:text-stone-100">{s.habit_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-orange-500 font-semibold">
                        <Flame size={12} />{s.current_streak}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-stone-500 dark:text-stone-400">{s.longest_streak}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium text-sm ${s.completion_rate_week >= 80 ? 'text-green-600' : s.completion_rate_week >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {s.completion_rate_week}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium text-sm ${s.completion_rate_month >= 80 ? 'text-green-600' : s.completion_rate_month >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {s.completion_rate_month}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-serif text-base ${momentumColor(s.momentum)}`}>
                        {s.momentum > 0 ? '+' : ''}{s.momentum}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-stone-500 dark:text-stone-400">{s.total_completions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmRestore !== null}
        title="Przywróć nawyk"
        message={`Czy na pewno chcesz przywrócić nawyk "${confirmRestore?.name}"? Pojawi się ponownie w widoku dziennym.`}
        confirmLabel="Przywróć"
        onConfirm={() => confirmRestore && restoreMutation.mutate(confirmRestore.id)}
        onCancel={() => setConfirmRestore(null)}
      />
    </div>
  )
}
