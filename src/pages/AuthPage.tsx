import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/useAuth'

export function AuthPage() {
  const { user, signInEmail, signUpEmail, signInGoogle } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'signin') await signInEmail(email, password)
      else await signUpEmail(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message.replace('Firebase: ', '') : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  const google = async () => {
    setError('')
    try {
      await signInGoogle()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message.replace('Firebase: ', '') : 'Sign-in failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-white">
          Career<span className="text-cobalt">/</span>Assistant
        </h1>
        <p className="mt-1 font-mono text-xs text-slate-500">
          pipeline control for your job hunt
        </p>
        <form onSubmit={submit} className="mt-8 space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-ink-soft bg-ink-soft/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cobalt focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-ink-soft bg-ink-soft/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cobalt focus:outline-none"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-cobalt py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          onClick={google}
          className="mt-3 w-full rounded-md border border-ink-soft py-2 text-sm text-slate-300 transition-colors hover:border-slate-500"
        >
          Continue with Google
        </button>
        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-6 w-full text-center text-xs text-slate-500 hover:text-slate-300"
        >
          {mode === 'signin' ? 'No account? Create one' : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
