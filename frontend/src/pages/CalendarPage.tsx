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

  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: () => habitsApi.list() })

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
      <h1 className="font-serif text-3xl text-stone-900 dark:text-stone-100">Kalendarz</h1>

      {/* Habit selector */}
      <div>
        <label className="block text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-3">
          Wybierz nawyk
        </label>
        <div className="flex flex-wrap gap-2">
          {habits.map(h => (
            <button
              key={h.id}
              onClick={() => setSelectedHabit(h.id === selectedHabit ? null : h.id)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                selectedHabit === h.id
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white dark:bg-warm-900 text-stone-600 dark:text-stone-300 border-warm-200 dark:border-warm-800 hover:border-warm-300 dark:hover:border-warm-700'
              )}
              style={selectedHabit === h.id ? {} : { borderLeftColor: h.category?.color, borderLeftWidth: 3 }}
            >
              {h.name}
            </button>
          ))}
        </div>
      </div>

      {selectedHabit && (
        <div className="bg-white dark:bg-warm-900 rounded-2xl border border-warm-200 dark:border-warm-800 p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="p-2 rounded-full hover:bg-warm-100 dark:hover:bg-warm-800 text-stone-400 transition-all"
            >
              <ChevronLeft size={17} />
            </button>
            <h2 className="font-serif text-xl text-stone-900 dark:text-stone-100 capitalize">
              {format(current, 'LLLL yyyy', { locale: pl })}
            </h2>
            <button
              onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="p-2 rounded-full hover:bg-warm-100 dark:hover:bg-warm-800 text-stone-400 transition-all"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          {/* DOW headers */}
          <div className="grid grid-cols-7 mb-2">
            {DOW.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-stone-400 dark:text-stone-500 py-1">{d}</div>
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
                    'aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-colors',
                    isToday && 'ring-2 ring-primary-400',
                    info?.paused && 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
                    info?.completed && !info.paused && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                    info?.failed && !info.completed && !info.paused && 'text-red-400 bg-red-50 dark:bg-red-900/10',
                    (!info || (!info.completed && !info.paused && !info.failed)) && 'text-stone-500 dark:text-stone-400'
                  )}
                >
                  {day}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-stone-400 dark:text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-green-200 dark:bg-green-900/50" /> Wykonano
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-red-100 dark:bg-red-900/20" /> Pominięto / wpadka
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-100 dark:bg-amber-900/20" /> Pauza
            </span>
          </div>
        </div>
      )}

      {!selectedHabit && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="font-serif text-xl text-stone-300 dark:text-stone-600">Wybierz nawyk</p>
          <p className="text-sm mt-1.5">aby zobaczyć jego kalendarz aktywności</p>
        </div>
      )}
    </div>
  )
}
