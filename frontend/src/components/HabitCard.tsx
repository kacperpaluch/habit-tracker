import { Check, Plus, Minus, Pause, Flame, ChevronDown, ChevronUp, Edit2, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import type { Habit, Entry } from '../types'

interface HabitCardProps {
  habit: Habit
  entry?: Entry
  onToggle: (habit: Habit, value?: number) => void
  onUncheck: (habit: Habit) => void
  onEdit: (habit: Habit) => void
  onDelete: (habit: Habit) => void
  streak?: number
}

export default function HabitCard({ habit, entry, onToggle, onUncheck, onEdit, onDelete, streak = 0 }: HabitCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [qty, setQty] = useState('')
  const done = !!entry
  const color = habit.category?.color ?? '#6366f1'

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

  const goalProgress = habit.mode === 'quantitative' && habit.goal_value && entry
    ? Math.min((entry.value / habit.goal_value) * 100, 100)
    : null

  return (
    <div
      className={clsx(
        'rounded-xl border bg-white dark:bg-gray-850 dark:border-gray-700 transition-all',
        done ? 'border-green-200 dark:border-green-900/50 bg-green-50/30 dark:bg-green-900/10' : 'border-gray-200',
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
            <span className={clsx('font-medium text-gray-900 dark:text-gray-100 truncate', done && 'line-through text-gray-400')}>
              {habit.name}
            </span>
            {habit.is_paused && <Pause size={14} className="text-amber-500 flex-shrink-0" />}
            {streak > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-orange-500 font-semibold flex-shrink-0">
                <Flame size={13} />
                {streak}
              </span>
            )}
          </div>
          {habit.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{habit.description}</p>
          )}
          {habit.mode === 'quantitative' && entry && (
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

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
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
      )}
    </div>
  )
}
