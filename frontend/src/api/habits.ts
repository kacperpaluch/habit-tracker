import api from './client'
import type { Habit, Entry, HabitStats, HeatmapEntry, CalendarDay, DailySummary, MomentumPoint } from '../types'

export const habitsApi = {
  list: (includeInactive = false) =>
    api.get<Habit[]>('/habits', { params: { include_inactive: includeInactive } }).then(r => r.data),
  get: (id: number) => api.get<Habit>(`/habits/${id}`).then(r => r.data),
  create: (data: Partial<Habit>) => api.post<Habit>('/habits', data).then(r => r.data),
  update: (id: number, data: Partial<Habit>) => api.put<Habit>(`/habits/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/habits/${id}`),
  hardDelete: (id: number) => api.delete(`/habits/${id}/hard`),
  restore: (id: number) => api.put<Habit>(`/habits/${id}/restore`).then(r => r.data),
  reorder: (ids: number[]) => api.post('/habits/reorder', ids),
}

export const entriesApi = {
  list: (params?: { habit_id?: number; date_from?: string; date_to?: string }) =>
    api.get<Entry[]>('/entries', { params }).then(r => r.data),
  create: (data: { habit_id: number; date: string; value?: number; note?: string }) =>
    api.post<Entry>('/entries', data).then(r => r.data),
  update: (id: number, data: { value?: number; note?: string }) =>
    api.put<Entry>(`/entries/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/entries/${id}`),
  deleteByDate: (habitId: number, date: string) =>
    api.delete(`/entries/habit/${habitId}/date/${date}`),
}

export const statsApi = {
  habitStats: (id: number) => api.get<HabitStats>(`/stats/habits/${id}`).then(r => r.data),
  heatmap: (year?: number) => api.get<HeatmapEntry[]>('/stats/heatmap', { params: { year } }).then(r => r.data),
  habitHeatmap: (id: number, year?: number) =>
    api.get<HeatmapEntry[]>(`/stats/heatmap/${id}`, { params: { year } }).then(r => r.data),
  calendar: (id: number, year?: number, month?: number) =>
    api.get<CalendarDay[]>(`/stats/calendar/${id}`, { params: { year, month } }).then(r => r.data),
  summary: () => api.get<DailySummary>('/stats/summary').then(r => r.data),
  allStats: (includeInactive?: boolean) =>
    api.get<HabitStats[]>('/stats/all-habits', { params: includeInactive ? { include_inactive: true } : {} }).then(r => r.data),
  momentumHistory: (id: number, days = 90) =>
    api.get<MomentumPoint[]>(`/stats/momentum/${id}`, { params: { days } }).then(r => r.data),
}
