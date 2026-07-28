import { useEffect, useState } from 'react'
import { useAuth } from '../stores/useAuth'
import { useAISettings, DEFAULT_MODELS } from '../stores/useAISettings'
import type { AIProvider } from '../stores/useAISettings'
import { testAIConnection } from '../lib/ai'

const PROVIDERS: { id: AIProvider; name: string; keyHint: string; keyUrl: string }[] = [
  { id: 'claude', name: 'Claude', keyHint: 'sk-ant-…', keyUrl: 'https://platform.claude.com/settings/keys' },
  { id: 'gemini', name: 'Gemini', keyHint: 'AIza…', keyUrl: 'https://aistudio.google.com/apikey' },
  { id: 'openai', name: 'OpenAI', keyHint: 'sk-…', keyUrl: 'https://platform.openai.com/api-keys' },
]

const labelCls = 'font-mono text-[11px] uppercase text-slate-400'
const inputCls =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cobalt focus:outline-none'

export function SettingsPage() {
  const user = useAuth((s) => s.user)
  const { settings, loaded, load, save } = useAISettings()
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const runTest = async () => {
    if (!form.apiKey.trim()) {
      setTestResult({ ok: false, message: 'Enter an API key first' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      await testAIConnection({
        provider: form.provider,
        apiKey: form.apiKey.trim(),
        model: form.model,
      })
      setTestResult({
        ok: true,
        message: `Connected — ${form.model?.trim() || DEFAULT_MODELS[form.provider]} responded`,
      })
    } catch (err) {
      setTestResult({
        ok: false,
        message: (err instanceof Error ? err.message : 'Connection failed').replace(/^Firebase: /, ''),
      })
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    if (user && !loaded) void load(user.uid)
  }, [user, loaded, load])

  useEffect(() => {
    setForm(settings)
  }, [settings])

  if (!user) return null
  if (!loaded) return <p className="p-6 font-mono text-sm text-slate-400">loading settings…</p>

  const provider = PROVIDERS.find((p) => p.id === form.provider)!

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.apiKey.trim()) {
      setError('API key is required')
      return
    }
    await save(user.uid, { ...form, apiKey: form.apiKey.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="font-display text-xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        The AI provider powers the resume builder, skill gap analysis, and interview prep. Your key
        is stored in your private account data and used only server-side.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label className={labelCls}>AI provider</label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {PROVIDERS.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setForm({ ...form, provider: p.id })}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  form.provider === p.id
                    ? 'border-cobalt bg-cobalt-soft text-cobalt'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>{provider.name} API key</label>
          <input
            type="password"
            value={form.apiKey}
            placeholder={provider.keyHint}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            className={inputCls}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-slate-400">
            Get one at{' '}
            <a href={provider.keyUrl} target="_blank" rel="noreferrer" className="text-cobalt hover:underline">
              {provider.keyUrl.replace('https://', '')}
            </a>
          </p>
        </div>

        <div>
          <label className={labelCls}>Model (optional)</label>
          <input
            value={form.model ?? ''}
            placeholder={`default: ${DEFAULT_MODELS[form.provider]}`}
            onChange={(e) => setForm({ ...form, model: e.target.value || undefined })}
            className={inputCls}
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-cobalt px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Save settings
          </button>
          <button
            type="button"
            onClick={runTest}
            disabled={testing}
            className="rounded-md border border-cobalt px-4 py-2 text-sm font-medium text-cobalt hover:bg-cobalt-soft disabled:opacity-50"
          >
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          {saved && <span className="font-mono text-xs text-stage-offer">saved ✓</span>}
        </div>
        {testResult && (
          <p className={`text-xs ${testResult.ok ? 'text-stage-offer' : 'text-red-500'}`}>
            {testResult.ok ? '✓ ' : '✕ '}
            {testResult.message}
          </p>
        )}
      </form>
    </div>
  )
}
