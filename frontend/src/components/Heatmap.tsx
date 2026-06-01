import { useMemo, useState } from 'react'
import { format, startOfYear, endOfYear, eachDayOfInterval, getDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import type { HeatmapEntry } from '../types'
import clsx from 'clsx'

interface HeatmapProps {
  data: HeatmapEntry[]
  year: number
}

const MONTHS = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
const DAYS = ['', 'Pon', '', 'Śr', '', 'Pt', '']

interface TooltipState {
  x: number
  y: number
  date: string
  count: number
}

function getColor(intensity: number): string {
  if (intensity === 0) return 'bg-gray-200 dark:bg-gray-700'
  if (intensity < 0.25) return 'bg-primary-200 dark:bg-primary-900'
  if (intensity < 0.5) return 'bg-primary-300 dark:bg-primary-700'
  if (intensity < 0.75) return 'bg-primary-500 dark:bg-primary-500'
  return 'bg-primary-700 dark:bg-primary-400'
}

export default function Heatmap({ data, year }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    data.forEach(d => { m[d.date] = d.count })
    return m
  }, [data])

  const maxCount = useMemo(() => Math.max(...data.map(d => d.count), 1), [data])

  const days = useMemo(() => {
    const start = startOfYear(new Date(year, 0, 1))
    const end = endOfYear(new Date(year, 0, 1))
    return eachDayOfInterval({ start, end })
  }, [year])

  // Pad to start on Monday
  const firstDow = (getDay(days[0]) + 6) % 7
  const cells: (Date | null)[] = [...Array(firstDow).fill(null), ...days]

  // Group into weeks
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  // Month labels
  const monthPositions: { label: string; week: number }[] = []
  weeks.forEach((week, wi) => {
    const first = week.find(Boolean)
    if (first && (first as Date).getDate() <= 7) {
      const m = (first as Date).getMonth()
      if (!monthPositions.find(x => x.label === MONTHS[m])) {
        monthPositions.push({ label: MONTHS[m], week: wi })
      }
    }
  })

  const handleCellEnter = (e: React.MouseEvent, dateStr: string, count: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 6,
      date: dateStr,
      count,
    })
  }

  const handleCellLeave = () => setTooltip(null)

  const handleCellClick = (e: React.MouseEvent, dateStr: string, count: number) => {
    if (tooltip?.date === dateStr) {
      setTooltip(null)
    } else {
      handleCellEnter(e, dateStr, count)
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="inline-flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 mr-1 justify-start pt-5">
            {DAYS.map((d, i) => (
              <div key={i} className="h-4 flex items-center text-xs text-gray-400 w-6">{d}</div>
            ))}
          </div>

          <div>
            {/* Month labels */}
            <div className="flex gap-1 mb-1">
              {weeks.map((_, wi) => {
                const mp = monthPositions.find(x => x.week === wi)
                return (
                  <div key={wi} className="w-4 text-xs text-gray-400 whitespace-nowrap">
                    {mp ? mp.label : ''}
                  </div>
                )
              })}
            </div>

            {/* Grid */}
            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) => {
                    if (!day) return <div key={di} className="w-4 h-4" />
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const count = counts[dateStr] || 0
                    const intensity = count / maxCount
                    return (
                      <div
                        key={di}
                        className={clsx(
                          'w-4 h-4 rounded-sm transition-colors cursor-pointer hover:ring-1 hover:ring-primary-400 hover:ring-offset-1',
                          getColor(intensity)
                        )}
                        onMouseEnter={e => handleCellEnter(e, dateStr, count)}
                        onMouseLeave={handleCellLeave}
                        onClick={e => handleCellClick(e, dateStr, count)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip — fixed position, visible on hover and on tap (mobile) */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {format(new Date(tooltip.date + 'T00:00:00'), 'd MMMM yyyy', { locale: pl })}
          <span className="ml-1.5 font-semibold">
            {tooltip.count === 0 ? '—' : `${tooltip.count} ${tooltip.count === 1 ? 'nawyk' : 'nawyki'}`}
          </span>
        </div>
      )}
    </>
  )
}
