import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '../stores/useAuth'

export function AuthPage() {
  const { user, signInGoogle } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const google = async () => {
    setError('')
    setBusy(true)
    try {
      await signInGoogle()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message.replace('Firebase: ', '') : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-3xl font-bold text-white">
          Career<span className="text-cobalt">/</span>Assistant
        </h1>
        <p className="mt-2 font-mono text-xs text-slate-500">
          pipeline control for your job hunt
        </p>
        <Button onClick={google} disabled={busy} className="mt-10 h-auto w-full py-2.5">
          {busy ? 'Signing in…' : 'Continue with Google'}
        </Button>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  )
}
