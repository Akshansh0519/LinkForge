import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi, AuthResponse } from './api'

interface AuthState {
  user: AuthResponse['user'] | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: true,
  })

  useEffect(() => {
    const stored = localStorage.getItem('linkforge_auth')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setState({ ...parsed, isLoading: false })
      } catch {
        setState(s => ({ ...s, isLoading: false }))
      }
    } else {
      setState(s => ({ ...s, isLoading: false }))
    }
  }, [])

  function persist(data: AuthResponse) {
    const authState = {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    }
    localStorage.setItem('linkforge_auth', JSON.stringify(authState))
    setState({ ...authState, isLoading: false })
  }

  async function login(email: string, password: string) {
    const data = await authApi.login(email, password)
    persist(data)
  }

  async function register(email: string, password: string) {
    const data = await authApi.register(email, password)
    persist(data)
  }

  function logout() {
    localStorage.removeItem('linkforge_auth')
    setState({ user: null, accessToken: null, refreshToken: null, isLoading: false })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
