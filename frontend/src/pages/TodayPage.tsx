import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChevronLeft, ChevronRight, Calendar, Sunrise, Sun, Moon, Clock, PartyPopper } from 'lucide-react'
import { format, addDays, subDays, isToday } from 'date-fns'
import { pl } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { habitsApi, entriesApi, statsApi } from '../api/habits'
import { categoriesApi } from '../api/categories'
import HabitCard from '../components/HabitCard'
import HabitForm from '../components/HabitForm'
import type { Habit, Entry } from '../types'

const TIME_GROUPS = [
  { key: 'morning',   label: 'Rano',       Icon: Sunrise },
  { key: 'afternoon', label: 'Popołudnie',  Icon: Sun     },
  { key: 'evening',   label: 'Wieczór',    Icon: Moon    },
  { key: 'none',      label: 'Dowolna',    Icon: Clock   },
] as const

export default function TodayPage() {
  const qc = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>()

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const isCurrentDay = isToday(selectedDate)

  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: habitsApi.list })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const { data: entries = [] } = useQuery({
    queryKey: ['entries', dateStr],
    queryFn: () => entriesApi.list({ date_from: dateStr, date_to: dateStr }),
  })
  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: statsApi.summary,
    enabled: isCurrentDay,
  })
  const { data: allStatsData = [] } = useQuery({
    queryKey: ['all-stats'],
    queryFn: statsApi.allStats,
    enabled: habits.length > 0,
  })

  const entryMap = useMemo(() => {
    const m: Record<number, Entry> = {}
    entries.forEach(e => { m[e.habit_id] = e })
    return m
  }, [entries])

  const streaks = useMemo(
    () => Object.fromEntries(allStatsData.map(s => [s.habit_id, s.current_streak])),
    [allStatsData]
  )

  const invalidateStats = () => {
    qc.invalidateQueries({ queryKey: ['entries', dateStr] })
    qc.invalidateQueries({ queryKey: ['summary'] })
    qc.invalidateQueries({ queryKey: ['all-stats'] })
    qc.invalidateQueries({ queryKey: ['heatmap'] })
    qc.invalidateQueries({ queryKey: ['momentum-history'] })
  }

  const toggleMutation = useMutation({
    mutationFn: ({ habit, value }: { habit: Habit; value?: number }) =>
      entriesApi.create({ habit_id: habit.id, date: dateStr, value: value ?? 1 }),
    onSuccess: invalidateStats,
  })

  const uncheckMutation = useMutation({
    mutationFn: (habit: Habit) => entriesApi.deleteByDate(habit.id, dateStr),
    onSuccess: invalidateStats,
  })

  const createHabitMutation = useMutation({
    mutationFn: (data: Partial<Habit>) => habitsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      setShowForm(false)
      toast.success('Nawyk dodany!')
    },
  })

  const updateHabitMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Habit> }) => habitsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      setEditingHabit(undefined)
      toast.success('Nawyk zaktualizowany!')
    },
  })

  const deleteHabitMutation = useMutation({
    mutationFn: (id: number) => habitsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['entries', dateStr] })
      toast.success('Nawyk usunięty')
    },
  })

  // Group by time_of_day
  const grouped = useMemo(() => {
    const groups: Record<string, Habit[]> = { morning: [], afternoon: [], evening: [], none: [] }
    habits.forEach(h => { groups[h.time_of_day ?? 'none'].push(h) })
    return groups
  }, [habits])

  const hasAnyTimeGrouping = habits.some(h => h.time_of_day !== null)

  // Done count per group (value > 0 only)
  const groupCounts = useMemo(() => {
    const result: Record<string, { done: number; total: number }> = {}
    Object.entries(grouped).forEach(([key, list]) => {
      result[key] = {
        done:  list.filter(h => (entryMap[h.id]?.value ?? 0) > 0).length,
        total: list.length,
      }
    })
    return result
  }, [grouped, entryMap])

  const allDone = isCurrentDay && summary && summary.total > 0 && summary.done === summary.total

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Date nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedDate(d => subDays(d, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {isCurrentDay ? 'Dzisiaj' : format(selectedDate, 'EEEE', { locale: pl })}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {format(selectedDate, 'd MMMM yyyy', { locale: pl })}
            </div>
          </div>
          <button
            onClick={() => setSelectedDate(d => addDays(d, 1))}
            disabled={isCurrentDay}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
          {!isCurrentDay && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg"
            >
              Dzisiaj
            </button>
          )}
        </div>

        <button
          onClick={() => { setEditingHabit(undefined); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nowy nawyk</span>
        </button>
      </div>

      {/* Progress block */}
      {isCurrentDay && summary && summary.total > 0 && (
        <div className={`rounded-xl p-5 border transition-colors ${
          allDone
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
        }`}>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Postęp dnia</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-none">
                {summary.done}
                <span className="text-lg font-normal text-gray-400 ml-1">z {summary.total}</span>
              </p>
              {allDone && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1 flex items-center gap-1">
                  <PartyPopper size={14} /> Wszystkie nawyki ukończone!
                </p>
              )}
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold leading-none ${
                allDone ? 'text-green-600 dark:text-green-400' : 'text-primary-600 dark:text-primary-400'
              }`}>
                {summary.rate}%
              </p>
              <p className="text-xs text-gray-400 mt-1">ukończono</p>
            </div>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                allDone
                  ? 'bg-green-500'
                  : 'bg-gradient-to-r from-primary-600 to-primary-400'
              }`}
              style={{ width: `${summary.rate}%` }}
            />
          </div>
        </div>
      )}

      {/* Habits */}
      {habits.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="mx-auto mb-3 opacity-30" size={48} />
          <p className="font-medium">Brak nawyków</p>
          <p className="text-sm mt-1">Dodaj swój pierwszy nawyk!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {TIME_GROUPS.map(({ key, label, Icon }) => {
            const group = grouped[key]
            if (!group || group.length === 0) return null
            const { done: doneCount, total: totalCount } = groupCounts[key]
            const sectionDone = doneCount === totalCount

            return (
              <div key={key}>
                {hasAnyTimeGrouping && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded-lg ${sectionDone ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <Icon size={14} className={sectionDone ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'} />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {label}
                    </h3>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 ml-1" />
                    <span className={`text-xs font-semibold tabular-nums ${
                      sectionDone ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                    }`}>
                      {doneCount}/{totalCount}
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {group.map(h => (
                    <HabitCard
                      key={h.id}
                      habit={h}
                      entry={entryMap[h.id]}
                      date={dateStr}
                      streak={streaks[h.id] ?? 0}
                      onToggle={(habit, value) => toggleMutation.mutate({ habit, value })}
                      onUncheck={uncheckMutation.mutate}
                      onEdit={habit => { setEditingHabit(habit); setShowForm(true) }}
                      onDelete={habit => {
                        if (confirm(`Usunąć nawyk "${habit.name}"?`)) {
                          deleteHabitMutation.mutate(habit.id)
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <HabitForm
          habit={editingHabit}
          categories={categories}
          onSave={data => {
            if (editingHabit) {
              updateHabitMutation.mutate({ id: editingHabit.id, data })
            } else {
              createHabitMutation.mutate(data)
            }
          }}
          onClose={() => { setShowForm(false); setEditingHabit(undefined) }}
        />
      )}
    </div>
  )
}
