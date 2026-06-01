import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, getDaysInMonth, startOfMonth, getDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import { habitsApi, statsApi } from '../api/habits'
import clsx from 'clsx'
import type { CalendarDay } from '../types'

const DOW = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date())
  const [selectedHabit, setSelectedHabit] = useState<number | null>(null)

  const year = current.getFullYear()
  const month = current.getMonth() + 1

  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: habitsApi.list })

  const { data: days = [] } = useQuery<CalendarDay[]>({
    queryKey: ['calendar', selectedHabit, year, month],
    queryFn: () => selectedHabit
      ? statsApi.calendar(selectedHabit, year, month)
      : Promise.resolve([]),
    enabled: !!selectedHabit,
  })

  const daysMap: Record<string, CalendarDay> = {}
  days.forEach(d => { daysMap[d.date] = d })

  const firstDow = (getDay(startOfMonth(current)) + 6) % 7
  const totalDays = getDaysInMonth(current)
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Kalendarz</h1>

      {/* Habit selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Wybierz nawyk</label>
        <div className="flex flex-wrap gap-2">
          {habits.map(h => (
            <button
              key={h.id}
              onClick={() => setSelectedHabit(h.id === selectedHabit ? null : h.id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                selectedHabit === h.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
              )}
              style={selectedHabit === h.id ? {} : { borderLeftColor: h.category?.color, borderLeftWidth: 3 }}
            >
              {h.name}
            </button>
          ))}
        </div>
      </div>

      {selectedHabit && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {format(current, 'LLLL yyyy', { locale: pl })}
            </h2>
            <button
              onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* DOW headers */}
          <div className="grid grid-cols-7 mb-2">
            {DOW.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const info = daysMap[dateStr]
              const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')

              return (
                <div
                  key={dateStr}
                  title={info?.note || undefined}
                  className={clsx(
                    'aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
                    isToday && 'ring-2 ring-primary-400',
                    info?.paused && 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
                    info?.completed && !info.paused && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                    !info?.completed && !info?.paused && dateStr <= format(new Date(), 'yyyy-MM-dd') && 'text-red-400 bg-red-50 dark:bg-red-900/10',
                    !info && 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  {day}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/50" /> Wykonano
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/20" /> Pominięto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/20" /> Pauza
            </span>
          </div>
        </div>
      )}

      {!selectedHabit && (
        <div className="text-center py-12 text-gray-400">
          <p>Wybierz nawyk, aby zobaczyć jego kalendarz</p>
        </div>
      )}
    </div>
  )
}
