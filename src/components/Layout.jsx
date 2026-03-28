import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  IconDashboard, IconRental, IconInventory, IconCalibration,
  IconAS, IconMaster, IconLogout, IconMenu, IconX
} from './icons'

const NAV = [
  { to: '/dashboard', label: '대시보드', icon: IconDashboard },
  { to: '/rental', label: '렌탈관리', icon: IconRental },
  { to: '/inventory', label: '재고관리', icon: IconInventory },
  { to: '/calibration', label: '교정관리', icon: IconCalibration },
  { to: '/as', label: 'AS출동관리', icon: IconAS },
  { to: '/master', label: '기초값관리', icon: IconMaster },
]

const PAGE_TITLES = {
  '/dashboard': '대시보드',
  '/rental': '렌탈관리',
  '/inventory': '재고관리',
  '/calibration': '교정관리',
  '/as': 'AS출동관리',
  '/master': '기초값관리',
}

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }
  const title = PAGE_TITLES[location.pathname] || '관리'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-60 bg-dark text-white
        flex flex-col transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/8 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-content text-xs font-bold tracking-wider text-center leading-8">T</div>
          <div>
            <div className="text-sm font-bold tracking-wide">TELLUSTECH</div>
            <div className="text-[10px] text-white/35 tracking-widest">ERP ADMIN</div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-brand text-white shadow-md shadow-brand/25'
                  : 'text-white/55 hover:text-white hover:bg-white/6'}
              `}
            >
              <Icon width={18} height={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/8 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name || 'Admin'}</div>
              <div className="text-[11px] text-white/35">{user?.id || 'admin'}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-white/45 hover:text-white hover:bg-white/6 transition-colors"
          >
            <IconLogout width={15} height={15} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-border flex items-center px-5 gap-4 shrink-0">
          <button className="lg:hidden text-mid" onClick={() => setOpen(true)}>
            <IconMenu />
          </button>
          <h1 className="text-lg font-bold text-dark">{title}</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
