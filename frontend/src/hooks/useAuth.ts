import { useState } from 'react'
import { authApi } from '../api/settings'

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  const login = async (username: string, password: string) => {
    const data = await authApi.login(username, password)
    localStorage.setItem('token', data.access_token)
    setToken(data.access_token)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  return { token, isAuthenticated: !!token, login, logout }
}
