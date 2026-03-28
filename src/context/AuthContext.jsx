import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('tl-user')
    return saved ? JSON.parse(saved) : null
  })

  const login = (id, pw) => {
    if (id === 'admin' && pw === 'admin1234') {
      const u = { id: 'admin', name: '관리자' }
      setUser(u)
      sessionStorage.setItem('tl-user', JSON.stringify(u))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('tl-user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
