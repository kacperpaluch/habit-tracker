import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format, addDays, subDays, isToday } from 'date-fns'
import { pl } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { habitsApi, entriesApi, statsApi } from '../api/habits'
import { categoriesApi } from '../api/categories'
import HabitCard from '../components/HabitCard'
import HabitForm from '../components/HabitForm'
import type { Habit, Entry } from '../types'

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

  // Per-habit streaks
  const streakQueries = useQuery({
    queryKey: ['streaks', habits.map(h => h.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(habits.map(h => statsApi.habitStats(h.id)))
      return Object.fromEntries(results.map(r => [r.habit_id, r.current_streak]))
    },
    enabled: habits.length > 0,
  })

  const entryMap = useMemo(() => {
    const m: Record<number, Entry> = {}
    entries.forEach(e => { m[e.habit_id] = e })
    return m
  }, [entries])

  const toggleMutation = useMutation({
    mutationFn: ({ habit, value }: { habit: Habit; value?: number }) =>
      entriesApi.create({ habit_id: habit.id, date: dateStr, value: value ?? 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries', dateStr] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      qc.invalidateQueries({ queryKey: ['streaks'] })
    },
  })

  const uncheckMutation = useMutation({
    mutationFn: (habit: Habit) => entriesApi.deleteByDate(habit.id, dateStr),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries', dateStr] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      qc.invalidateQueries({ queryKey: ['streaks'] })
    },
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

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, Habit[]> = {}
    const nocat: Habit[] = []
    habits.forEach(h => {
      if (h.category) {
        const key = h.category.name
        if (!groups[key]) groups[key] = []
        groups[key].push(h)
      } else {
        nocat.push(h)
      }
    })
    return { groups, nocat }
  }, [habits])

  const streaks = streakQueries.data ?? {}

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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

      {/* Progress bar */}
      {isCurrentDay && summary && summary.total > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Postęp dnia
            </span>
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
              {summary.done}/{summary.total} ({summary.rate}%)
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
              style={{ width: `${summary.rate}%` }}
            />
          </div>
        </div>
      )}

      {/* Habits grouped by category */}
      {habits.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="mx-auto mb-3 opacity-30" size={48} />
          <p className="font-medium">Brak nawyków</p>
          <p className="text-sm mt-1">Dodaj swój pierwszy nawyk!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped.groups).map(([catName, catHabits]) => {
            const color = catHabits[0]?.category?.color ?? '#6366f1'
            return (
              <div key={catName}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {catName}
                  </h3>
                </div>
                <div className="space-y-2">
                  {catHabits.map(h => (
                    <HabitCard
                      key={h.id}
                      habit={h}
                      entry={entryMap[h.id]}
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

          {grouped.nocat.length > 0 && (
            <div>
              {Object.keys(grouped.groups).length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bez kategorii
                  </h3>
                </div>
              )}
              <div className="space-y-2">
                {grouped.nocat.map(h => (
                  <HabitCard
                    key={h.id}
                    habit={h}
                    entry={entryMap[h.id]}
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
          )}
        </div>
      )}

      {/* Habit Form Modal */}
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
