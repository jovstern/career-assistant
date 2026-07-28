import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
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
  const { settings, loaded, save, subscribe } = useAISettings()
  const [provider, setProvider] = useState<AIProvider>(settings.provider)
  const [model, setModel] = useState(settings.model ?? '')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    if (user) return subscribe(user.uid)
  }, [user, subscribe])

  useEffect(() => {
    setProvider(settings.provider)
    setModel(settings.model ?? '')
  }, [settings])

  if (!user) return null
  if (!loaded) return <p className="p-6 font-mono text-sm text-slate-400">loading settings…</p>

  const providerInfo = PROVIDERS.find((p) => p.id === provider)!

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!settings.hasKey && !apiKeyInput.trim()) {
      setError('API key is required')
      return
    }
    await save(user.uid, { provider, model: model.trim() || undefined }, apiKeyInput || undefined)
    setApiKeyInput('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const runTest = async () => {
    if (!settings.hasKey && !apiKeyInput.trim()) {
      setTestResult({ ok: false, message: 'Enter an API key first' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      await testAIConnection({
        provider,
        apiKey: apiKeyInput.trim() || undefined,
        model: model.trim() || undefined,
      })
      setTestResult({
        ok: true,
        message: `Connected — ${model.trim() || DEFAULT_MODELS[provider]} responded`,
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

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="font-display text-xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        The AI provider powers the resume builder, skill gap analysis, and interview prep.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label className={labelCls}>AI provider</label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {PROVIDERS.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  provider === p.id
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
          <label className={labelCls}>{providerInfo.name} API key</label>
          <input
            type="password"
            value={apiKeyInput}
            placeholder={
              settings.hasKey ? '••••••••••••  key saved — type to replace' : providerInfo.keyHint
            }
            onChange={(e) => setApiKeyInput(e.target.value)}
            className={inputCls}
            autoComplete="off"
          />
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-stage-offer" />
            <span>
              Your key is stored <strong>write-only</strong> and encrypted at rest: once saved, it
              can't be read back by this app, your browser, or anyone else — it's used exclusively
              inside secure server functions to call {providerInfo.name} on your behalf.
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Get one at{' '}
            <a href={providerInfo.keyUrl} target="_blank" rel="noreferrer" className="text-cobalt hover:underline">
              {providerInfo.keyUrl.replace('https://', '')}
            </a>
          </p>
        </div>

        <div>
          <label className={labelCls}>Model (optional)</label>
          <input
            value={model}
            placeholder={`default: ${DEFAULT_MODELS[provider]}`}
            onChange={(e) => setModel(e.target.value)}
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
