export interface Category {
  id: number
  name: string
  color: string
  created_at: string
}

export interface Habit {
  id: number
  name: string
  description: string
  mode: 'binary' | 'quantitative' | 'negative' | 'timed'
  goal_value: number | null
  goal_unit: string | null
  category_id: number | null
  category: Category | null
  schedule_type: 'daily' | 'weekly_x' | 'weekly_days' | 'monthly_x'
  schedule_params: Record<string, unknown>
  reminder_time: string | null
  is_active: boolean
  is_paused: boolean
  pause_start: string | null
  pause_end: string | null
  created_at: string
  order: number
}

export interface Entry {
  id: number
  habit_id: number
  date: string
  value: number
  note: string
  created_at: string
  updated_at: string
}

export interface HabitStats {
  habit_id: number
  habit_name: string
  current_streak: number
  longest_streak: number
  completion_rate_week: number
  completion_rate_month: number
  total_completions: number
  momentum: number
}

export interface MomentumPoint {
  date: string
  momentum: number
}

export interface HeatmapEntry {
  date: string
  count: number
}

export interface CalendarDay {
  date: string
  completed: boolean
  value: number | null
  note: string | null
  paused: boolean
  scheduled: boolean
  failed: boolean
}

export interface WeekdayStat {
  weekday: number
  rate: number
  scheduled_count: number
}

export interface HabitWeakDay {
  habit_id: number
  habit_name: string
  weekday: number
  rate: number
  overall_rate: number
}

export interface CorrelationInsight {
  habit_a_id: number
  habit_a_name: string
  habit_b_id: number
  habit_b_name: string
  phi: number
  p_b_given_a: number
  p_b_given_not_a: number
  shared_days: number
}

export interface DecliningHabit {
  habit_id: number
  habit_name: string
  momentum_now: number
  momentum_then: number
  drop: number
}

export interface Insights {
  weekday: WeekdayStat[]
  best_day: number | null
  worst_day: number | null
  habit_weak_days: HabitWeakDay[]
  correlations: CorrelationInsight[]
  declining: DecliningHabit[]
}

/** Done semantics shared with the backend: quantitative/timed require reaching the goal. */
export function isEntryDone(habit: Habit, entry?: Entry | null): boolean {
  if (!entry || entry.value <= 0) return false
  if ((habit.mode === 'quantitative' || habit.mode === 'timed') && habit.goal_value) {
    return entry.value >= habit.goal_value
  }
  return true
}

export interface Settings {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_tls: boolean
  smtp_from: string
  notification_email: string
  backup_enabled: boolean
  backup_retention: number
  backup_cron: string
  daily_summary_time: string
  daily_summary_enabled: boolean
  timezone: string
  username: string
}

export interface BackupInfo {
  filename: string
  size: number
  created_at: string
}

export interface DailySummary {
  date: string
  total: number
  done: number
  rate: number
  habits: Array<{
    habit_id: number
    name: string
    completed: boolean
    value: number | null
    goal_value: number | null
    mode: string
  }>
}
