import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Bot,
  FileText,
  Inbox,
  SquareKanban,
  Settings,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../stores/useAuth'
import { useAISettings } from '../stores/useAISettings'

const navItems = [
  { to: '/', label: 'Board', Icon: SquareKanban },
  { to: '/resumes', label: 'Resumes', Icon: FileText },
  { to: '/profile', label: 'Profile', Icon: UserRound },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

function AIStatus() {
  const { settings, loaded } = useAISettings()
  const connected = loaded && settings.hasKey
  return (
    <NavLink
      to="/settings"
      className="flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors hover:bg-ink-soft/60"
      title={connected ? 'AI agent ready' : 'Configure an AI provider to enable agent tasks'}
    >
      <Bot size={14} className={connected ? 'text-stage-offer' : 'text-slate-500'} />
      {!loaded ? (
        <span className="text-slate-500">checking AI…</span>
      ) : connected ? (
        <span className="text-slate-300">
          AI connected
          <span className="ml-1.5 font-mono text-[10px] text-stage-offer">● {settings.provider}</span>
        </span>
      ) : (
        <span className="text-amber-400">AI not connected — set up</span>
      )}
    </NavLink>
  )
}

export function Layout() {
  const { user, logOut } = useAuth()
  const subscribe = useAISettings((s) => s.subscribe)

  useEffect(() => {
    if (user) return subscribe(user.uid)
  }, [user, subscribe])

  return (
    <div className="flex h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-ink text-slate-300 print:hidden">
        <div className="px-5 py-6">
          <span className="font-display text-lg font-bold text-white">
            Career<span className="text-white">/</span>Assistant
          </span>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-ink-soft text-white' : 'hover:bg-ink-soft/60 hover:text-white'
                }`
              }
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
          <div
            className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600"
            title="Job matches are coming soon"
          >
            <Inbox size={16} className="shrink-0" />
            <span>Matches</span>
            <span className="ml-auto rounded-full bg-ink-soft px-2 py-0.5 font-mono text-[9px] uppercase text-slate-500">
              soon
            </span>
          </div>
        </nav>

        <div className="mt-auto px-3 pb-2">
          <AIStatus />
        </div>
        <div className="border-t border-ink-soft px-5 py-4">
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
