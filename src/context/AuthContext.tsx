import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface AuthContextData {
  token: string | null
  loading: boolean
  signIn: (token: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadToken()
  }, [])

  async function loadToken() {
    const storedToken = localStorage.getItem('@app_token')
    setToken(storedToken)
    setLoading(false)
  }

  async function signIn(newToken: string) {
    localStorage.setItem('@app_token', newToken)
    localStorage.setItem('@token', newToken)
    setToken(newToken)
  }

  async function signOut() {
    localStorage.removeItem('@app_token')
    localStorage.removeItem('@token')
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
