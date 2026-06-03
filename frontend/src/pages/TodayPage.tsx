import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChevronLeft, ChevronRight, Calendar, PartyPopper } from 'lucide-react'
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

  const groupedByCategory = useMemo(() => {
    const byId: Record<number, Habit[]> = {}
    const uncategorized: Habit[] = []
    habits.forEach(h => {
      if (h.category_id != null) {
        if (!byId[h.category_id]) byId[h.category_id] = []
        byId[h.category_id].push(h)
      } else {
        uncategorized.push(h)
      }
    })
    const result: Array<{ id: number | null; name: string; color: string; habits: Habit[] }> = []
    categories.forEach(cat => {
      if (byId[cat.id]?.length) {
        result.push({ id: cat.id, name: cat.name, color: cat.color, habits: byId[cat.id] })
      }
    })
    if (uncategorized.length) {
      result.push({ id: null, name: 'Bez kategorii', color: '#b8a898', habits: uncategorized })
    }
    return result
  }, [habits, categories])

  const allDone = isCurrentDay && summary && summary.total > 0 && summary.done === summary.total

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(d => subDays(d, 1))}
            className="p-2 rounded-full hover:bg-warm-100 dark:hover:bg-warm-850 text-stone-400 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center min-w-[120px]">
            <div className="font-semibold text-stone-900 dark:text-stone-100 capitalize text-sm">
              {isCurrentDay ? 'Dzisiaj' : format(selectedDate, 'EEEE', { locale: pl })}
            </div>
            <div className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
              {format(selectedDate, 'd MMMM yyyy', { locale: pl })}
            </div>
          </div>
          <button
            onClick={() => setSelectedDate(d => addDays(d, 1))}
            disabled={isCurrentDay}
            className="p-2 rounded-full hover:bg-warm-100 dark:hover:bg-warm-850 text-stone-400 disabled:opacity-20 transition-all"
          >
            <ChevronRight size={18} />
          </button>
          {!isCurrentDay && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-xs px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full font-medium"
            >
              Dziś
            </button>
          )}
        </div>

        <button
          onClick={() => { setEditingHabit(undefined); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full text-sm font-medium transition-all shadow-sm shadow-primary-600/20"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span className="hidden sm:inline">Nowy nawyk</span>
        </button>
      </div>

      {/* Progress block */}
      {isCurrentDay && summary && summary.total > 0 && (
        <div className={`rounded-2xl p-5 border transition-all ${
          allDone
            ? 'bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-900/40'
            : 'bg-white dark:bg-warm-900 border-warm-200 dark:border-warm-800'
        }`}>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">
                Postęp dnia
              </p>
              <p className="font-serif text-5xl text-stone-900 dark:text-stone-100 leading-none">
                {summary.done}
                <span className="text-2xl text-stone-300 dark:text-stone-600 ml-2 font-sans font-normal">
                  / {summary.total}
                </span>
              </p>
              {allDone && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-2 flex items-center gap-1.5">
                  <PartyPopper size={14} /> Wszystkie nawyki ukończone!
                </p>
              )}
            </div>
            <div className="text-right">
              <p className={`font-serif text-5xl leading-none ${
                allDone ? 'text-green-600 dark:text-green-400' : 'text-primary-600 dark:text-primary-400'
              }`}>
                {summary.rate}
                <span className="font-sans text-2xl font-normal">%</span>
              </p>
              <p className="text-xs text-stone-400 mt-1">ukończono</p>
            </div>
          </div>
          <div className="h-2 bg-warm-100 dark:bg-warm-800 rounded-full overflow-hidden">
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

      {/* Habits list */}
      {habits.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <Calendar className="mx-auto mb-4 opacity-20" size={52} />
          <p className="font-serif text-xl text-stone-300 dark:text-stone-600">Brak nawyków</p>
          <p className="text-sm mt-1.5 text-stone-400 dark:text-stone-500">Dodaj swój pierwszy nawyk!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByCategory.map(({ id, name, color, habits: groupHabits }) => {
            const done = groupHabits.filter(h => (entryMap[h.id]?.value ?? 0) > 0).length
            const total = groupHabits.length
            const sectionDone = done === total

            return (
              <div key={id ?? 'uncategorized'}>
                {groupedByCategory.length > 1 && (
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      {name}
                    </h3>
                    <div className="flex-1 h-px bg-warm-200 dark:bg-warm-800 ml-1" />
                    <span className={`text-xs font-semibold tabular-nums ${
                      sectionDone ? 'text-green-600 dark:text-green-400' : 'text-stone-400 dark:text-stone-500'
                    }`}>
                      {done}/{total}
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {groupHabits.map(h => (
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
