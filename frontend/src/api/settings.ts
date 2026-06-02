import api from './client'
import type { Settings, BackupInfo } from '../types'

export const settingsApi = {
  get: () => api.get<Settings>('/settings').then(r => r.data),
  update: (data: Partial<Settings> & { current_password?: string; new_password?: string }) =>
    api.put<Settings>('/settings', data).then(r => r.data),
  testEmail: () => api.post('/settings/test-email'),
}

export const backupApi = {
  list: () => api.get<BackupInfo[]>('/backup/list').then(r => r.data),
  export: () => { window.location.href = '/api/backup/export' },
  download: (filename: string) => { window.location.href = `/api/backup/download/${encodeURIComponent(filename)}` },
  import: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/backup/import', form)
  },
  restoreDb: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/backup/restore-db', form)
  },
  restoreFromServer: (filename: string) => api.post(`/backup/restore/${encodeURIComponent(filename)}`),
  delete: (filename: string) => api.delete(`/backup/${filename}`),
}

export const authApi = {
  getConfig: () =>
    api.get<{ auth_disabled: boolean }>('/auth/config').then(r => r.data),
  login: (username: string, password: string) =>
    api.post<{ access_token: string; token_type: string }>('/auth/login', { username, password }).then(r => r.data),
}
