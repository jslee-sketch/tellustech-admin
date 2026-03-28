import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      if (login(id, pw)) {
        navigate('/dashboard')
      } else {
        setError('아이디 또는 비밀번호가 일치하지 않습니다.')
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark p-4">
      {/* BG pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
        backgroundSize: '32px 32px'
      }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand text-white text-xl font-bold mb-4 shadow-lg shadow-brand/30">
            T
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">TELLUSTECH</h1>
          <p className="text-xs text-white/30 tracking-[0.3em] mt-1">ERP ADMIN SYSTEM</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="bg-dark2 border border-white/8 rounded-2xl p-7 space-y-5">
          <div>
            <label className="block text-[11px] font-semibold text-white/35 tracking-wider uppercase mb-2">아이디</label>
            <input
              type="text"
              value={id}
              onChange={e => setId(e.target.value)}
              placeholder="admin"
              autoFocus
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-white/35 tracking-wider uppercase mb-2">비밀번호</label>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
            />
          </div>

          {error && (
            <div className="text-xs text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand text-white text-sm font-bold tracking-wider uppercase rounded-xl hover:bg-brand-light transition-colors disabled:opacity-60 shadow-lg shadow-brand/20"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>

          <p className="text-center text-[11px] text-white/20 mt-4">
            테스트 계정: admin / admin1234
          </p>
        </form>
      </div>
    </div>
  )
}
