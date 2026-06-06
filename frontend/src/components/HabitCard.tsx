import { Check, Plus, Pause, Flame, ChevronDown, ChevronUp, Edit2, Trash2, FileText, RotateCcw, Archive } from 'lucide-react'
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
  onHardDelete?: (habit: Habit) => void
  onRestore?: (habit: Habit) => void
  streak?: number
  archived?: boolean
}

export default function HabitCard({ habit, entry, date, onToggle, onUncheck, onEdit, onDelete, onHardDelete, onRestore, streak = 0, archived = false }: HabitCardProps) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [qty, setQty] = useState('')
  const [noteText, setNoteText] = useState<string | null>(null)
  const [justChecked, setJustChecked] = useState(false)

  const done = !!entry && entry.value > 0
  const color = habit.category?.color ?? '#d97706'
  const currentNote = entry?.note ?? ''

  useEffect(() => {
    setNoteText(null)
  }, [entry?.id, entry?.note])

  useEffect(() => {
    if (done) {
      setJustChecked(true)
      const t = setTimeout(() => setJustChecked(false), 500)
      return () => clearTimeout(t)
    }
  }, [done])

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
        'rounded-2xl border transition-all duration-200 animate-card-in',
        done
          ? 'bg-green-50/60 dark:bg-green-900/10 border-green-200 dark:border-green-900/40'
          : archived
            ? 'bg-warm-50/60 dark:bg-warm-900/40 border-warm-150 dark:border-warm-800/60'
            : 'bg-white dark:bg-warm-900 border-warm-200 dark:border-warm-800',
        habit.is_paused && !archived && 'opacity-55',
        archived && 'opacity-70'
      )}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Check button */}
        <button
          onClick={handleToggle}
          disabled={habit.is_paused || archived}
          className={clsx(
            'flex-shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all touch-manipulation',
            archived && 'border-warm-200 dark:border-warm-700 text-warm-300 dark:text-warm-600 cursor-default',
            !archived && done
              ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-200 dark:shadow-green-900/40'
              : !archived && 'border-warm-300 dark:border-warm-700 text-warm-300 dark:text-warm-700 hover:border-primary-400 hover:text-primary-500 hover:shadow-sm',
            justChecked && 'animate-check-pop'
          )}
        >
          {archived
            ? <Pause size={14} className="text-warm-300 dark:text-stone-600" />
            : done
              ? <Check size={20} strokeWidth={2.5} />
              : habit.mode === 'quantitative' ? <Plus size={18} /> : <Check size={18} />
          }
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx(
              'font-medium text-stone-900 dark:text-stone-100 truncate',
              done && 'line-through text-stone-400 dark:text-stone-500',
              archived && 'text-stone-400 dark:text-stone-500'
            )}>
              {habit.name}
            </span>
            {archived && (
              <span className="text-[10px] px-2 py-0.5 bg-warm-200 dark:bg-warm-800 rounded-full text-stone-500 dark:text-stone-400 font-medium flex-shrink-0">
                archiwum
              </span>
            )}
            {!archived && habit.is_paused && <Pause size={13} className="text-amber-500 flex-shrink-0" />}
            {currentNote && !archived && (
              <span title={currentNote}>
                <FileText size={12} className="text-stone-400 flex-shrink-0" />
              </span>
            )}
          </div>
          {habit.description && (
            <p className="text-xs text-stone-400 dark:text-stone-500 truncate mt-0.5">{habit.description}</p>
          )}
          {habit.mode === 'quantitative' && entry && entry.value > 0 && !archived && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                <span>{entry.value} / {habit.goal_value} {habit.goal_unit}</span>
                <span className="font-medium">{goalProgress?.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-warm-100 dark:bg-warm-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Streak + expand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!archived && streak > 0 && (
            <span className="flex items-center gap-0.5">
              <Flame size={14} className="text-orange-500" />
              <span className="font-serif text-base font-normal text-orange-500 leading-none">{streak}</span>
            </span>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-stone-300 dark:text-stone-600 hover:text-stone-500 dark:hover:text-stone-400 rounded-full hover:bg-warm-100 dark:hover:bg-warm-800 transition-all"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-warm-100 dark:border-warm-800 pt-3 animate-fade-in-up">
          {/* Quantitative input — hidden in archive */}
          {!archived && habit.mode === 'quantitative' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder={`Dodaj ${habit.goal_unit || 'wartość'}`}
                className="w-36 px-3 py-1.5 text-sm border border-warm-200 dark:border-warm-800 rounded-xl bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-primary-400 focus:outline-none"
              />
              <button
                onClick={handleAddQty}
                className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium transition-colors"
              >
                Dodaj
              </button>
            </div>
          )}

          {/* Note field — hidden in archive */}
          {!archived && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-400 dark:text-stone-500">
                Notatka {!done && <span className="text-stone-300 dark:text-stone-600">(nawyk niewykonany)</span>}
              </label>
              <textarea
                rows={2}
                value={displayNote}
                onChange={e => setNoteText(e.target.value)}
                placeholder={done ? 'Dodaj notatkę do dzisiejszego wpisu…' : 'Dlaczego pominąłem? Co mi przeszkodziło?'}
                className="w-full px-3 py-2 text-sm border border-warm-200 dark:border-warm-800 rounded-xl bg-white dark:bg-warm-900 text-stone-900 dark:text-stone-100 resize-none focus:ring-2 focus:ring-primary-400 focus:outline-none placeholder:text-stone-300 dark:placeholder:text-stone-600"
              />
              {noteDirty && (
                <button
                  onClick={() => noteMutation.mutate(noteText!)}
                  disabled={noteMutation.isPending}
                  className="px-4 py-1.5 text-xs bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium disabled:opacity-60 transition-colors"
                >
                  {noteMutation.isPending ? 'Zapisywanie…' : 'Zapisz notatkę'}
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-0.5">
            <button
              onClick={() => onEdit(habit)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-primary-600 dark:hover:text-primary-400 border border-warm-200 dark:border-warm-800 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 transition-all"
            >
              <Edit2 size={12} /> Edytuj
            </button>
            {archived && onRestore ? (
              <button
                onClick={() => onRestore(habit)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-green-600 dark:hover:text-green-400 border border-warm-200 dark:border-warm-800 rounded-xl hover:border-green-300 dark:hover:border-green-800 transition-all"
              >
                <RotateCcw size={12} /> Przywróć
              </button>
            ) : (
              <button
                onClick={() => onDelete(habit)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 border border-warm-200 dark:border-warm-800 rounded-xl hover:border-amber-300 dark:hover:border-amber-800 transition-all"
              >
                <Archive size={12} /> Archiwizuj
              </button>
            )}
            {onHardDelete && (
              <button
                onClick={() => onHardDelete(habit)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 border border-warm-200 dark:border-warm-800 rounded-xl hover:border-red-300 dark:hover:border-red-800 transition-all"
              >
                <Trash2 size={12} /> Usuń na stałe
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
