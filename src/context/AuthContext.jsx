import { createContext, useContext, useState } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('tl-user')
    return saved ? JSON.parse(saved) : null
  })

  const login = async (username, password) => {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    const res = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    const { access_token, user: userData } = res.data
    sessionStorage.setItem('tl-token', access_token)
    const u = { id: userData?.username || username, name: userData?.name || username }
    setUser(u)
    sessionStorage.setItem('tl-user', JSON.stringify(u))
    return true
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('tl-token')
    sessionStorage.removeItem('tl-user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
