import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Button } from '@/components/ui/button'
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

const emptyPerProvider: Record<AIProvider, string> = { claude: '', gemini: '', openai: '' }

export function SettingsPage() {
  const user = useAuth((s) => s.user)
  const { settings, loaded, save, subscribe } = useAISettings()
  const [provider, setProvider] = useState<AIProvider>(settings.provider)
  // Form state is kept per provider, so switching tabs doesn't leak a key
  // or model override typed for one provider into another.
  const [keys, setKeys] = useState({ ...emptyPerProvider })
  const [models, setModels] = useState({ ...emptyPerProvider })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    if (user) return subscribe(user.uid)
  }, [user, subscribe])

  useEffect(() => {
    setProvider(settings.provider)
    if (settings.model) {
      setModels((m) => ({ ...m, [settings.provider]: settings.model ?? '' }))
    }
  }, [settings])

  if (!user) return null
  if (!loaded) return <p className="p-6 font-mono text-sm text-slate-400">loading settings…</p>

  const providerInfo = PROVIDERS.find((p) => p.id === provider)!
  const apiKeyInput = keys[provider]
  const modelInput = models[provider]
  // The stored key belongs to the provider that was saved — a different tab has no saved key.
  const hasSavedKey = settings.hasKey && provider === settings.provider

  const selectProvider = (p: AIProvider) => {
    setProvider(p)
    setError('')
    setTestResult(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!hasSavedKey && !apiKeyInput.trim()) {
      setError(`Enter your ${providerInfo.name} API key`)
      return
    }
    await save(user.uid, { provider, model: modelInput.trim() || undefined }, apiKeyInput || undefined)
    setKeys((k) => ({ ...k, [provider]: '' }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const runTest = async () => {
    if (!hasSavedKey && !apiKeyInput.trim()) {
      setTestResult({ ok: false, message: `Enter your ${providerInfo.name} API key first` })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      await testAIConnection({
        provider,
        apiKey: apiKeyInput.trim() || undefined,
        model: modelInput.trim() || undefined,
      })
      setTestResult({
        ok: true,
        message: `Connected — ${modelInput.trim() || DEFAULT_MODELS[provider]} responded`,
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
          <ToggleGroup
            value={[provider]}
            onValueChange={(values) => {
              const p = values[0] as AIProvider | undefined
              if (p) selectProvider(p)
            }}
            className="mt-1 grid w-full grid-cols-3 gap-2"
          >
            {PROVIDERS.map((p) => (
              <ToggleGroupItem
                key={p.id}
                value={p.id}
                className="h-auto rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 data-pressed:border-cobalt data-pressed:bg-cobalt-soft data-pressed:text-cobalt"
              >
                <span className="flex flex-col items-center gap-0.5">
                  {p.name}
                  {settings.hasKey && settings.provider === p.id && (
                    <span className="font-mono text-[9px] uppercase text-stage-offer">active</span>
                  )}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div>
          <label className={labelCls}>{providerInfo.name} API key</label>
          <input
            type="password"
            value={apiKeyInput}
            placeholder={
              hasSavedKey ? '••••••••••••  key saved — type to replace' : providerInfo.keyHint
            }
            onChange={(e) => setKeys((k) => ({ ...k, [provider]: e.target.value }))}
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
            value={modelInput}
            placeholder={`default: ${DEFAULT_MODELS[provider]}`}
            onChange={(e) => setModels((m) => ({ ...m, [provider]: e.target.value }))}
            className={inputCls}
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit">Save settings</Button>
          <Button
            type="button"
            variant="outline"
            onClick={runTest}
            disabled={testing}
            className="border-cobalt text-cobalt hover:bg-cobalt-soft hover:text-cobalt"
          >
            {testing ? 'Testing…' : 'Test connection'}
          </Button>
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
