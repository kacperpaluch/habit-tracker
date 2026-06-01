import { useMemo } from 'react'
import { format, startOfYear, endOfYear, eachDayOfInterval, getDay } from 'date-fns'
import type { HeatmapEntry } from '../types'
import clsx from 'clsx'

interface HeatmapProps {
  data: HeatmapEntry[]
  year: number
}

const MONTHS = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
const DAYS = ['', 'Pon', '', 'Śr', '', 'Pt', '']

export default function Heatmap({ data, year }: HeatmapProps) {
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
  const firstDow = (getDay(days[0]) + 6) % 7 // 0=Mon
  const cells: (Date | null)[] = [...Array(firstDow).fill(null), ...days]

  // Group into weeks
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  function getColor(count: number): string {
    if (!count) return 'bg-gray-100 dark:bg-gray-800'
    const intensity = count / maxCount
    if (intensity < 0.25) return 'bg-primary-200 dark:bg-primary-900'
    if (intensity < 0.5) return 'bg-primary-300 dark:bg-primary-700'
    if (intensity < 0.75) return 'bg-primary-500 dark:bg-primary-500'
    return 'bg-primary-700 dark:bg-primary-400'
  }

  // Month labels position (which week index each month starts)
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

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1 justify-start pt-5">
          {DAYS.map((d, i) => (
            <div key={i} className="h-3 flex items-center text-xs text-gray-400 w-6">{d}</div>
          ))}
        </div>

        <div>
          {/* Month labels */}
          <div className="flex gap-1 mb-1">
            {weeks.map((_, wi) => {
              const mp = monthPositions.find(x => x.week === wi)
              return (
                <div key={wi} className="w-3 text-xs text-gray-400 whitespace-nowrap">
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
                  if (!day) return <div key={di} className="w-3 h-3" />
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const count = counts[dateStr] || 0
                  return (
                    <div
                      key={di}
                      title={`${dateStr}: ${count} nawyków`}
                      className={clsx('w-3 h-3 rounded-sm transition-colors', getColor(count))}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
