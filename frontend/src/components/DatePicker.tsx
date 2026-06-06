import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isToday, isAfter, subMonths, addMonths } from 'date-fns'
import { pl } from 'date-fns/locale'

interface DatePickerProps {
  selected: Date
  onSelect: (date: Date) => void
  onClose: () => void
}

const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Czw', 'Pt', 'Sb', 'Nd']

export default function DatePicker({ selected, onSelect, onClose }: DatePickerProps) {
  const [month, setMonth] = useState(startOfMonth(selected))

  const days = eachDayOfInterval({
    start: startOfWeek(month, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })

  return (
    <div className="absolute top-full mt-2 z-30 bg-white dark:bg-warm-900 rounded-2xl border border-warm-200 dark:border-warm-800 shadow-2xl p-4 w-[280px] animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMonth(m => subMonths(m, 1))}
          className="p-1.5 rounded-full hover:bg-warm-100 dark:hover:bg-warm-800 text-stone-400"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-medium text-sm text-stone-700 dark:text-stone-300 capitalize">
          {format(month, 'LLLL yyyy', { locale: pl })}
        </span>
        <button
          onClick={() => setMonth(m => addMonths(m, 1))}
          disabled={isAfter(addMonths(month, 1), new Date())}
          className="p-1.5 rounded-full hover:bg-warm-100 dark:hover:bg-warm-800 text-stone-400 disabled:opacity-20"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-stone-400 dark:text-stone-500 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const isCurrentMonth = day.getMonth() === month.getMonth()
          const isSel = isSameDay(day, selected)
          const isTodayDate = isToday(day)
          const isFuture = isAfter(day, new Date())

          return (
            <button
              key={day.toISOString()}
              onClick={() => {
                if (!isFuture && isCurrentMonth) {
                  onSelect(day)
                  onClose()
                }
              }}
              disabled={isFuture || !isCurrentMonth}
              className={`w-9 h-9 rounded-full text-xs font-medium transition-all ${
                !isCurrentMonth
                  ? 'text-transparent'
                  : isSel
                    ? 'bg-primary-600 text-white'
                    : isTodayDate
                      ? 'text-primary-600 dark:text-primary-400 font-semibold'
                      : isFuture
                        ? 'text-stone-300 dark:text-stone-600'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-warm-100 dark:hover:bg-warm-800'
              }`}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
