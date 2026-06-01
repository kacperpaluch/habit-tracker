import api from './client'
import type { Category } from '../types'

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories').then(r => r.data),
  create: (data: { name: string; color?: string; icon?: string }) =>
    api.post<Category>('/categories', data).then(r => r.data),
  update: (id: number, data: Partial<Category>) =>
    api.put<Category>(`/categories/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/categories/${id}`),
}
