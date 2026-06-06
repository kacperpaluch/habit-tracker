import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Habit, Category } from '../types'

interface HabitFormProps {
  habit?: Habit
  categories: Category[]
  onSave: (data: Partial<Habit>) => void
  onClose: () => void
}

const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']

export default function HabitForm({ habit, categories, onSave, onClose }: HabitFormProps) {
  const [form, setForm] = useState({
    name: habit?.name ?? '',
    description: habit?.description ?? '',
    mode: habit?.mode ?? 'binary' as 'binary' | 'quantitative',
    goal_value: habit?.goal_value?.toString() ?? '',
    goal_unit: habit?.goal_unit ?? '',
    category_id: habit?.category_id?.toString() ?? '',
    schedule_type: habit?.schedule_type ?? 'daily' as string,
    schedule_params: habit?.schedule_params ?? {} as Record<string, unknown>,
    reminder_time: habit?.reminder_time ?? '',
    is_paused: habit?.is_paused ?? false,
    pause_start: habit?.pause_start ?? '',
    pause_end: habit?.pause_end ?? '',
  })

  const [weeklyTimes, setWeeklyTimes] = useState(
    (habit?.schedule_params as { times?: number })?.times?.toString() ?? '3'
  )
  const [weeklyDays, setWeeklyDays] = useState<number[]>(
    (habit?.schedule_params as { days?: number[] })?.days ?? []
  )
  const [monthlyTimes, setMonthlyTimes] = useState(
    (habit?.schedule_params as { times?: number })?.times?.toString() ?? '1'
  )

  const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let schedule_params: Record<string, unknown> = {}
    if (form.schedule_type === 'weekly_x') {
      schedule_params = { times: parseInt(weeklyTimes) || 3 }
    } else if (form.schedule_type === 'weekly_days') {
      schedule_params = { days: weeklyDays }
    } else if (form.schedule_type === 'monthly_x') {
      schedule_params = { times: parseInt(monthlyTimes) || 1 }
    }

    onSave({
      name: form.name,
      description: form.description,
      mode: form.mode,
      goal_value: form.mode === 'quantitative' ? parseFloat(form.goal_value) || null : null,
      goal_unit: form.mode === 'quantitative' ? form.goal_unit || null : null,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      schedule_type: form.schedule_type as Habit['schedule_type'],
      schedule_params,
      reminder_time: form.reminder_time || null,
      is_paused: form.is_paused,
      pause_start: form.is_paused && form.pause_start ? form.pause_start : null,
      pause_end: form.is_paused && form.pause_end ? form.pause_end : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-warm-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white dark:bg-warm-900 px-6 pt-5 pb-4 border-b border-warm-200 dark:border-warm-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {habit ? 'Edytuj nawyk' : 'Nowy nawyk'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-800 text-stone-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Nazwa *</label>
            <input
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-warm-200 dark:border-warm-800 rounded-lg bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="np. Medytacja"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Opis</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="w-full px-3 py-2 border border-warm-200 dark:border-warm-800 rounded-lg bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Mode */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Tryb</label>
            <select
              value={form.mode}
              onChange={e => set('mode', e.target.value)}
              className="w-full px-3 py-2 border border-warm-200 dark:border-warm-800 rounded-lg bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100"
            >
              <option value="binary">Tak/Nie</option>
              <option value="quantitative">Ilościowy</option>
            </select>
          </div>

          {/* Goal (quantitative) */}
          {form.mode === 'quantitative' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Cel liczbowy</label>
                <input
                  type="number"
                  value={form.goal_value}
                  onChange={e => set('goal_value', e.target.value)}
                  className="w-full px-3 py-2 border border-warm-200 dark:border-warm-800 rounded-lg bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100"
                  placeholder="np. 2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Jednostka</label>
                <input
                  value={form.goal_unit}
                  onChange={e => set('goal_unit', e.target.value)}
                  className="w-full px-3 py-2 border border-warm-200 dark:border-warm-800 rounded-lg bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100"
                  placeholder="np. L, strony, km"
                />
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Kategoria</label>
            <select
              value={form.category_id}
              onChange={e => set('category_id', e.target.value)}
              className="w-full px-3 py-2 border border-warm-200 dark:border-warm-800 rounded-lg bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100"
            >
              <option value="">Brak kategorii</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Częstotliwość</label>
            <select
              value={form.schedule_type}
              onChange={e => set('schedule_type', e.target.value)}
              className="w-full px-3 py-2 border border-warm-200 dark:border-warm-800 rounded-lg bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100"
            >
              <option value="daily">Codziennie</option>
              <option value="weekly_x">X razy w tygodniu</option>
              <option value="weekly_days">Konkretne dni tygodnia</option>
              <option value="monthly_x">X razy w miesiącu</option>
            </select>

            {form.schedule_type === 'weekly_x' && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number" min="1" max="7"
                  value={weeklyTimes}
                  onChange={e => setWeeklyTimes(e.target.value)}
                  className="w-20 px-3 py-2 border border-warm-200 dark:border-warm-800 rounded-lg bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100"
                />
                <span className="text-sm text-stone-600 dark:text-stone-400">razy w tygodniu</span>
              </div>
            )}

            {form.schedule_type === 'weekly_days' && (
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {WEEKDAYS.map((day, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setWeeklyDays(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i])}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      weeklyDays.includes(i)
                        ? 'bg-primary-600 text-white'
                        : 'bg-warm-100 dark:bg-warm-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}

            {form.schedule_type === 'monthly_x' && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number" min="1" max="31"
                  value={monthlyTimes}
                  onChange={e => setMonthlyTimes(e.target.value)}
                  className="w-20 px-3 py-2 border border-warm-200 dark:border-warm-800 rounded-lg bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100"
                />
                <span className="text-sm text-stone-600 dark:text-stone-400">razy w miesiącu</span>
              </div>
            )}
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Godzina przypomnienia</label>
            <input
              type="time"
              value={form.reminder_time}
              onChange={e => set('reminder_time', e.target.value)}
              className="w-full px-3 py-2 border border-warm-200 dark:border-warm-800 rounded-lg bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100"
            />
          </div>

          {/* Pause */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_paused}
                onChange={e => set('is_paused', e.target.checked)}
                className="w-4 h-4 rounded border-warm-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-stone-700 dark:text-stone-300">Nawyk wstrzymany (pauza)</span>
            </label>
            {form.is_paused && (
              <div className="grid grid-cols-2 gap-4 pl-7">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Pauza od</label>
                  <input
                    type="date"
                    value={form.pause_start}
                    onChange={e => set('pause_start', e.target.value)}
                    className="w-full px-3 py-2 border border-warm-200 dark:border-warm-800 rounded-lg bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Pauza do (opcjonalnie)</label>
                  <input
                    type="date"
                    value={form.pause_end}
                    onChange={e => set('pause_end', e.target.value)}
                    min={form.pause_start || undefined}
                    className="w-full px-3 py-2 border border-warm-200 dark:border-warm-800 rounded-lg bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-warm-200 dark:border-warm-800 rounded-xl text-stone-700 dark:text-stone-300 hover:bg-warm-50 dark:hover:bg-warm-800 font-medium"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
            >
              {habit ? 'Zapisz' : 'Dodaj nawyk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
