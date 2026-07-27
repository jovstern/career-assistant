import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../stores/useAuth'

const navItems = [
  { to: '/', label: 'Board', code: 'BRD' },
  { to: '/profile', label: 'Profile', code: 'PRF' },
]

export function Layout() {
  const { user, logOut } = useAuth()
  return (
    <div className="flex h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-ink text-slate-300">
        <div className="px-5 py-6">
          <span className="font-display text-lg font-bold text-white">
            Career<span className="text-cobalt">/</span>Assistant
          </span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-ink-soft text-white' : 'hover:bg-ink-soft/60 hover:text-white'
                }`
              }
            >
              <span>{item.label}</span>
              <span className="font-mono text-[10px] text-slate-500">{item.code}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-ink-soft px-5 py-4">
          <p className="truncate font-mono text-xs text-slate-500">{user?.email}</p>
          <button
            onClick={logOut}
            className="mt-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
