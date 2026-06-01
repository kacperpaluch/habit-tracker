import { Check, Plus, Pause, Flame, ChevronDown, ChevronUp, Edit2, Trash2, FileText } from 'lucide-react'
import clsx from 'clsx'
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { entriesApi } from '../api/habits'
import type { Habit, Entry } from '../types'

interface HabitCardProps {
  habit: Habit
  entry?: Entry
  date: string
  onToggle: (habit: Habit, value?: number) => void
  onUncheck: (habit: Habit) => void
  onEdit: (habit: Habit) => void
  onDelete: (habit: Habit) => void
  streak?: number
}

export default function HabitCard({ habit, entry, date, onToggle, onUncheck, onEdit, onDelete, streak = 0 }: HabitCardProps) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [qty, setQty] = useState('')
  const [noteText, setNoteText] = useState<string | null>(null)

  // value > 0 = actually done; value = 0 = note-only entry
  const done = !!entry && entry.value > 0
  const color = habit.category?.color ?? '#6366f1'
  const currentNote = entry?.note ?? ''

  useEffect(() => {
    setNoteText(null)
  }, [entry?.id, entry?.note])

  const noteMutation = useMutation({
    mutationFn: (text: string) => {
      if (entry) {
        return entriesApi.update(entry.id, { note: text })
      }
      return entriesApi.create({ habit_id: habit.id, date, value: 0, note: text })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] })
      setNoteText(null)
    },
  })

  const handleToggle = () => {
    if (done) {
      onUncheck(habit)
    } else if (habit.mode === 'quantitative') {
      setExpanded(true)
    } else {
      onToggle(habit)
    }
  }

  const handleAddQty = () => {
    const v = parseFloat(qty)
    if (!isNaN(v) && v > 0) {
      onToggle(habit, v)
      setQty('')
    }
  }

  const goalProgress = habit.mode === 'quantitative' && habit.goal_value && entry && entry.value > 0
    ? Math.min((entry.value / habit.goal_value) * 100, 100)
    : null

  const displayNote = noteText ?? currentNote
  const noteDirty = noteText !== null && noteText !== currentNote

  return (
    <div
      className={clsx(
        'rounded-xl border bg-white dark:bg-gray-850 dark:border-gray-700 transition-all',
        done
          ? 'border-green-200 dark:border-green-900/50 bg-green-50/40 dark:bg-green-900/10'
          : 'border-gray-200',
        habit.is_paused && 'opacity-60'
      )}
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Check button */}
        <button
          onClick={handleToggle}
          disabled={habit.is_paused}
          className={clsx(
            'flex-shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all touch-manipulation',
            done
              ? 'bg-green-500 border-green-500 text-white shadow-sm'
              : 'border-gray-300 dark:border-gray-600 text-gray-300 hover:border-primary-400 hover:text-primary-400'
          )}
        >
          {done ? <Check size={20} strokeWidth={2.5} /> : (
            habit.mode === 'quantitative' ? <Plus size={18} /> : <Check size={18} />
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx(
              'font-medium text-gray-900 dark:text-gray-100 truncate',
              done && 'line-through text-gray-400 dark:text-gray-500'
            )}>
              {habit.name}
            </span>
            {habit.is_paused && <Pause size={14} className="text-amber-500 flex-shrink-0" />}
            {currentNote && (
              <span title={currentNote}>
                <FileText size={13} className="text-gray-400 flex-shrink-0" />
              </span>
            )}
          </div>
          {habit.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{habit.description}</p>
          )}
          {habit.mode === 'quantitative' && entry && entry.value > 0 && (
            <div className="mt-1.5">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{entry.value} / {habit.goal_value} {habit.goal_unit}</span>
                <span>{goalProgress?.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Streak + expand */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {streak > 0 && (
            <span className="flex items-center gap-0.5 text-sm font-bold text-orange-500">
              <Flame size={15} />
              {streak}
            </span>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
          {/* Quantitative input */}
          {habit.mode === 'quantitative' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder={`Dodaj ${habit.goal_unit || 'wartość'}`}
                className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={handleAddQty}
                className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Dodaj
              </button>
            </div>
          )}

          {/* Note field — always visible */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Notatka {!done && <span className="text-gray-400">(nawyk niewykonany)</span>}
            </label>
            <textarea
              rows={2}
              value={displayNote}
              onChange={e => setNoteText(e.target.value)}
              placeholder={done ? 'Dodaj notatkę do dzisiejszego wpisu…' : 'Dlaczego pominąłem? Co mi przeszkodziło?'}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:ring-1 focus:ring-primary-400 focus:outline-none"
            />
            {noteDirty && (
              <button
                onClick={() => noteMutation.mutate(noteText!)}
                disabled={noteMutation.isPending}
                className="px-3 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60"
              >
                {noteMutation.isPending ? 'Zapisywanie…' : 'Zapisz notatkę'}
              </button>
            )}
          </div>

          {/* Edit / Delete */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onEdit(habit)}
              className="flex items-center gap-1.5 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300"
            >
              <Edit2 size={13} /> Edytuj
            </button>
            <button
              onClick={() => onDelete(habit)}
              className="flex items-center gap-1.5 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-300"
            >
              <Trash2 size={13} /> Usuń
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
