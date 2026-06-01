import { useState, useEffect } from 'react'
import { authApi } from '../api/settings'

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [authDisabled, setAuthDisabled] = useState<boolean | null>(null)

  useEffect(() => {
    authApi.getConfig()
      .then(({ auth_disabled }) => setAuthDisabled(auth_disabled))
      .catch(() => setAuthDisabled(false))
  }, [])

  const login = async (username: string, password: string) => {
    const data = await authApi.login(username, password)
    localStorage.setItem('token', data.access_token)
    setToken(data.access_token)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  return {
    token,
    isAuthenticated: authDisabled === true || !!token,
    isLoadingAuth: authDisabled === null,
    authDisabled: authDisabled ?? false,
    login,
    logout,
  }
}
