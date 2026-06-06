import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChevronLeft, ChevronRight, Calendar, PartyPopper, GripVertical, ChevronUp, ChevronDown, Check, Archive } from 'lucide-react'
import { format, addDays, subDays, isToday, isAfter, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { pl } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { habitsApi, entriesApi, statsApi } from '../api/habits'
import { categoriesApi } from '../api/categories'
import HabitCard from '../components/HabitCard'
import HabitForm from '../components/HabitForm'
import DatePicker from '../components/DatePicker'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Habit, Entry } from '../types'

type ViewMode = 'day' | 'week'

export default function TodayPage() {
  const qc = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>()
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [editOrder, setEditOrder] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Habit | null>(null)
  const [confirmHardDelete, setConfirmHardDelete] = useState<Habit | null>(null)
  const [showArchive, setShowArchive] = useState(false)

  const isCurrentDay = isToday(selectedDate)

  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return []
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [viewMode, selectedDate])

  const entriesFrom = viewMode === 'week' ? format(weekDays[0] || selectedDate, 'yyyy-MM-dd') : format(selectedDate, 'yyyy-MM-dd')
  const entriesTo = viewMode === 'week' ? format(weekDays[6] || selectedDate, 'yyyy-MM-dd') : format(selectedDate, 'yyyy-MM-dd')

  const { data: habits = [] } = useQuery({
    queryKey: ['habits', showArchive],
    queryFn: () => habitsApi.list(showArchive),
  })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const { data: entries = [] } = useQuery({
    queryKey: ['entries', entriesFrom, entriesTo],
    queryFn: () => entriesApi.list({ date_from: entriesFrom, date_to: entriesTo }),
    enabled: !showArchive,
  })
  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: statsApi.summary,
    enabled: isCurrentDay && viewMode === 'day' && !showArchive,
  })
  const { data: allStatsData = [] } = useQuery({
    queryKey: ['all-stats'],
    queryFn: () => statsApi.allStats(),
    enabled: habits.length > 0 && !showArchive,
  })

  const activeHabits = useMemo(() => habits.filter(h => h.is_active), [habits])
  const archivedHabits = useMemo(() => showArchive ? habits.filter(h => !h.is_active) : [], [showArchive, habits])

  const entryMap = useMemo(() => {
    const m: Record<number, Entry> = {}
    entries.forEach(e => { m[e.habit_id] = e })
    return m
  }, [entries])

  const weekEntryMap = useMemo(() => {
    if (viewMode !== 'week') return {}
    const m: Record<number, Record<string, Entry>> = {}
    entries.forEach(e => {
      if (!m[e.habit_id]) m[e.habit_id] = {}
      m[e.habit_id][e.date] = e
    })
    return m
  }, [viewMode, entries])

  const streaks = useMemo(
    () => Object.fromEntries(allStatsData.map(s => [s.habit_id, s.current_streak])),
    [allStatsData]
  )

  const invalidateStats = () => {
    qc.invalidateQueries({ queryKey: ['entries'] })
    qc.invalidateQueries({ queryKey: ['summary'] })
    qc.invalidateQueries({ queryKey: ['all-stats'] })
    qc.invalidateQueries({ queryKey: ['heatmap'] })
    qc.invalidateQueries({ queryKey: ['momentum-history'] })
  }

  const toggleMutation = useMutation({
    mutationFn: ({ habit, date, value }: { habit: Habit; date: string; value?: number }) =>
      entriesApi.create({ habit_id: habit.id, date, value: value ?? 1 }),
    onSuccess: invalidateStats,
  })

  const uncheckMutation = useMutation({
    mutationFn: ({ habit, date }: { habit: Habit; date: string }) =>
      entriesApi.deleteByDate(habit.id, date),
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
      qc.invalidateQueries({ queryKey: ['entries'] })
      qc.invalidateQueries({ queryKey: ['all-stats'] })
      setConfirmDelete(null)
      toast.success('Nawyk przeniesiony do archiwum')
    },
  })

  const hardDeleteHabitMutation = useMutation({
    mutationFn: (id: number) => habitsApi.hardDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['entries'] })
      qc.invalidateQueries({ queryKey: ['all-stats'] })
      qc.invalidateQueries({ queryKey: ['heatmap'] })
      qc.invalidateQueries({ queryKey: ['momentum-history'] })
      setConfirmHardDelete(null)
      toast.success('Nawyk usunięty na stałe')
    },
  })

  const restoreHabitMutation = useMutation({
    mutationFn: (id: number) => habitsApi.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      toast.success('Nawyk przywrócony!')
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => habitsApi.reorder(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })

  const groupedByCategory = useMemo(() => {
    const byId: Record<number, Habit[]> = {}
    const uncategorized: Habit[] = []
    const list = showArchive ? archivedHabits : activeHabits
    list.forEach(h => {
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
  }, [activeHabits, archivedHabits, categories, showArchive])

  const allDone = isCurrentDay && viewMode === 'day' && !showArchive && summary && summary.total > 0 && summary.done === summary.total

  const moveHabit = (index: number, direction: -1 | 1) => {
    const newHabits = [...activeHabits]
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= newHabits.length) return
    ;[newHabits[index], newHabits[targetIndex]] = [newHabits[targetIndex], newHabits[index]]
    reorderMutation.mutate(newHabits.map(h => h.id))
  }

  const prevWeek = () => setSelectedDate(d => subDays(d, 7))
  const nextWeek = () => {
    const next = addDays(selectedDate, 7)
    if (!isAfter(addDays(new Date(), 1), next)) return
    setSelectedDate(next)
  }
  const isInThisWeek = weekDays.some(d => isToday(d))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* View toggle & navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setShowArchive(false); setViewMode('day') }}
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
        <div className="flex items-center gap-1">
          {!showArchive && !editOrder && (
            <button
              onClick={() => setEditOrder(true)}
              title="Zmień kolejność nawyków"
              className="p-2 rounded-full hover:bg-warm-100 dark:hover:bg-warm-800 text-stone-400 dark:text-stone-500 transition-all"
            >
              <GripVertical size={16} />
            </button>
          )}
          {!showArchive && editOrder && (
            <button
              onClick={() => setEditOrder(false)}
              className="px-3 py-1 text-xs font-medium bg-primary-600 text-white rounded-full transition-all"
            >
              Gotowe
            </button>
          )}
        </div>
      </div>

      {/* Date navigation — hidden in archive */}
      {!showArchive && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => viewMode === 'day' ? setSelectedDate(d => subDays(d, 1)) : prevWeek()}
              className="p-2 rounded-full hover:bg-warm-100 dark:hover:bg-warm-850 text-stone-400 transition-all"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowDatePicker(v => !v)}
                className="text-center min-w-[120px] cursor-pointer hover:bg-warm-100 dark:hover:bg-warm-850 rounded-xl py-1 px-2 transition-all"
              >
                <div className="font-semibold text-stone-900 dark:text-stone-100 capitalize text-sm">
                  {viewMode === 'day'
                    ? (isCurrentDay ? 'Dzisiaj' : format(selectedDate, 'EEEE', { locale: pl }))
                    : (isInThisWeek ? 'Ten tydzień' : `Tydzień ${format(weekDays[0], 'd MMM', { locale: pl })}`)
                  }
                </div>
                <div className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                  {viewMode === 'day'
                    ? format(selectedDate, 'd MMMM yyyy', { locale: pl })
                    : `${format(weekDays[0], 'd', { locale: pl })}–${format(weekDays[6], 'd MMM yyyy', { locale: pl })}`
                  }
                </div>
              </button>
              {showDatePicker && (
                <DatePicker
                  selected={selectedDate}
                  onSelect={d => setSelectedDate(d)}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </div>

            <button
              onClick={() => viewMode === 'day' ? setSelectedDate(d => addDays(d, 1)) : nextWeek()}
              disabled={viewMode === 'day' ? isCurrentDay : isInThisWeek}
              className="p-2 rounded-full hover:bg-warm-100 dark:hover:bg-warm-850 text-stone-400 disabled:opacity-20 transition-all"
            >
              <ChevronRight size={18} />
            </button>
            {(viewMode === 'day' && !isCurrentDay) && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-xs px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full font-medium"
              >
                Dziś
              </button>
            )}
            {(viewMode === 'week' && !isInThisWeek) && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-xs px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full font-medium"
              >
                Dziś
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  viewMode === 'day'
                    ? 'bg-primary-600 text-white'
                    : 'text-stone-500 dark:text-stone-400 hover:bg-warm-100 dark:hover:bg-warm-800'
                }`}
              >
                Dzień
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  viewMode === 'week'
                    ? 'bg-primary-600 text-white'
                    : 'text-stone-500 dark:text-stone-400 hover:bg-warm-100 dark:hover:bg-warm-800'
                }`}
              >
                Tydzień
              </button>
            </div>
            <button
              onClick={() => { setEditingHabit(undefined); setShowForm(true) }}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full text-sm font-medium transition-all shadow-sm shadow-primary-600/20"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span className="hidden sm:inline">Nowy nawyk</span>
            </button>
          </div>
        </div>
      )}

      {/* Day view: Progress block */}
      {!showArchive && viewMode === 'day' && isCurrentDay && summary && summary.total > 0 && (
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

      {/* Week view: header row */}
      {!showArchive && viewMode === 'week' && (
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="grid grid-cols-[minmax(100px,1fr)_repeat(7,minmax(42px,1fr))] gap-1 items-end mb-2">
            <div />
            {weekDays.map(day => (
              <div key={day.toISOString()} className="text-center">
                <div className="text-[10px] font-medium text-stone-400 dark:text-stone-500 uppercase">
                  {format(day, 'EEE', { locale: pl })}
                </div>
                <div className={`text-sm font-semibold ${
                  isToday(day)
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-stone-700 dark:text-stone-300'
                }`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Habits list */}
      {(showArchive ? archivedHabits.length === 0 : activeHabits.length === 0) ? (
        <div className="text-center py-20 text-stone-400">
          <Archive className="mx-auto mb-4 opacity-20" size={52} />
          <p className="font-serif text-xl text-stone-300 dark:text-stone-600">
            {showArchive ? 'Archiwum jest puste' : 'Brak nawyków'}
          </p>
          <p className="text-sm mt-1.5 text-stone-400 dark:text-stone-500">
            {showArchive
              ? 'Zarchiwizowane nawyki pojawią się tutaj'
              : 'Dodaj swój pierwszy nawyk!'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByCategory.map(({ id, name, color, habits: groupHabits }) => {
            const done = !showArchive && viewMode === 'day'
              ? groupHabits.filter(h => (entryMap[h.id]?.value ?? 0) > 0).length
              : 0
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
                    {!showArchive && viewMode === 'day' && (
                      <span className={`text-xs font-semibold tabular-nums ${
                        sectionDone ? 'text-green-600 dark:text-green-400' : 'text-stone-400 dark:text-stone-500'
                      }`}>
                        {done}/{total}
                      </span>
                    )}
                  </div>
                )}

                {showArchive ? (
                  <div className="space-y-2">
                    {groupHabits.map(h => (
                      <HabitCard
                        key={h.id}
                        habit={h}
                        entry={undefined}
                        date={format(selectedDate, 'yyyy-MM-dd')}
                        onToggle={() => {}}
                        onUncheck={() => {}}
                        onEdit={habit => { setEditingHabit(habit); setShowForm(true) }}
                        onDelete={habit => setConfirmDelete(habit)}
                        onHardDelete={habit => setConfirmHardDelete(habit)}
                        onRestore={habit => restoreHabitMutation.mutate(habit.id)}
                        archived
                      />
                    ))}
                  </div>
                ) : viewMode === 'day' ? (
                  <div className="space-y-2">
                    {groupHabits.map((h, idx) => {
                      const globalIdx = activeHabits.findIndex(gh => gh.id === h.id)
                      return (
                        <div key={h.id} className="flex gap-1">
                          {editOrder && (
                            <div className="flex flex-col justify-center gap-0.5 flex-shrink-0 mr-0.5">
                              <button
                                onClick={() => moveHabit(globalIdx, -1)}
                                disabled={globalIdx === 0}
                                className="p-0.5 text-stone-300 dark:text-stone-600 hover:text-primary-500 disabled:opacity-20 transition-colors"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                onClick={() => moveHabit(globalIdx, 1)}
                                disabled={globalIdx === activeHabits.length - 1}
                                className="p-0.5 text-stone-300 dark:text-stone-600 hover:text-primary-500 disabled:opacity-20 transition-colors"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          )}
                          <div className="flex-1">
                            <HabitCard
                              habit={h}
                              entry={entryMap[h.id]}
                              date={format(selectedDate, 'yyyy-MM-dd')}
                              streak={streaks[h.id] ?? 0}
                              onToggle={(habit, value) =>
                                toggleMutation.mutate({ habit, date: format(selectedDate, 'yyyy-MM-dd'), value })
                              }
                              onUncheck={(habit) =>
                                uncheckMutation.mutate({ habit, date: format(selectedDate, 'yyyy-MM-dd') })
                              }
                              onEdit={habit => { setEditingHabit(habit); setShowForm(true) }}
                              onDelete={habit => setConfirmDelete(habit)}
                              onHardDelete={habit => setConfirmHardDelete(habit)}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 px-4">
                    <div className="space-y-1">
                      {groupHabits.map(h => (
                        <div
                          key={h.id}
                          className="grid grid-cols-[minmax(100px,1fr)_repeat(7,minmax(42px,1fr))] gap-1 items-center py-1"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-medium text-stone-700 dark:text-stone-300 truncate">
                              {h.name}
                            </span>
                            {(streaks[h.id] ?? 0) > 0 && (
                              <span className="text-[10px] font-medium text-orange-500 flex-shrink-0">
                                {streaks[h.id]}
                              </span>
                            )}
                          </div>
                          {weekDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd')
                            const entry = weekEntryMap[h.id]?.[dateStr]
                            const dayDone = !!entry && entry.value > 0
                            const isPausedOnDay = h.is_paused && (
                              (!h.pause_start || new Date(h.pause_start) <= day) &&
                              (!h.pause_end || new Date(h.pause_end) >= day)
                            )
                            const isFuture = isAfter(day, new Date())

                            return (
                              <div key={dateStr} className="flex justify-center">
                                <button
                                  onClick={() => {
                                    if (isFuture || isPausedOnDay) return
                                    if (dayDone) {
                                      uncheckMutation.mutate({ habit: h, date: dateStr })
                                    } else if (h.mode === 'quantitative') {
                                      toggleMutation.mutate({ habit: h, date: dateStr, value: 1 })
                                    } else {
                                      toggleMutation.mutate({ habit: h, date: dateStr })
                                    }
                                  }}
                                  disabled={isFuture || isPausedOnDay}
                                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all touch-manipulation ${
                                    isPausedOnDay
                                      ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-amber-400'
                                      : isFuture
                                        ? 'border border-warm-100 dark:border-warm-800 text-transparent'
                                        : dayDone
                                          ? 'bg-green-500 text-white shadow-sm shadow-green-200'
                                          : isToday(day)
                                            ? 'border-2 border-primary-400 dark:border-primary-600 text-stone-300 dark:text-stone-600 hover:bg-warm-100 dark:hover:bg-warm-800'
                                            : 'border border-warm-200 dark:border-warm-800 text-stone-300 dark:text-stone-600 hover:bg-warm-100 dark:hover:bg-warm-800'
                                  }`}
                                >
                                  {dayDone ? <Check size={14} strokeWidth={2.5} /> : null}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Archiwizuj nawyk"
        message={`Czy na pewno chcesz archiwizować nawyk "${confirmDelete?.name}"? Przestanie być widoczny w widoku dziennym — dane i historia pozostaną w bazie. Możesz go przywrócić w każdej chwili z poziomu Archiwum.`}
        confirmLabel="Archiwizuj"
        danger
        onConfirm={() => confirmDelete && deleteHabitMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={confirmHardDelete !== null}
        title="Usuń nawyk na stałe"
        message={`Czy na pewno chcesz bezpowrotnie usunąć nawyk "${confirmHardDelete?.name}"? Wszystkie wpisy, notatki i historia zostaną skasowane. Tej operacji nie można cofnąć.`}
        confirmLabel="Usuń bezpowrotnie"
        danger
        onConfirm={() => confirmHardDelete && hardDeleteHabitMutation.mutate(confirmHardDelete.id)}
        onCancel={() => setConfirmHardDelete(null)}
      />
    </div>
  )
}
