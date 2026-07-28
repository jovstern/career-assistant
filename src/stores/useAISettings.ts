import { create } from 'zustand'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export type AIProvider = 'claude' | 'gemini' | 'openai'

/** Client-visible settings. The API key itself is write-only (users/{uid}/secrets/ai). */
export interface AISettings {
  provider: AIProvider
  model?: string
  hasKey: boolean
}

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: 'claude-opus-5',
  gemini: 'gemini-2.5-pro',
  openai: 'gpt-5',
}

export const emptySettings: AISettings = { provider: 'claude', hasKey: false }

interface AISettingsState {
  settings: AISettings
  loaded: boolean
  save: (uid: string, settings: Omit<AISettings, 'hasKey'>, newApiKey?: string) => Promise<void>
  subscribe: (uid: string) => () => void
}

export const useAISettings = create<AISettingsState>((set, get) => ({
  settings: emptySettings,
  loaded: false,
  save: async (uid, settings, newApiKey) => {
    const key = newApiKey?.trim()
    if (key) {
      await setDoc(doc(db, 'users', uid, 'secrets', 'ai'), { apiKey: key })
    }
    const hasKey = !!key || get().settings.hasKey
    await setDoc(doc(db, 'users', uid, 'settings', 'ai'), {
      provider: settings.provider,
      model: settings.model ?? null,
      hasKey,
      updatedAt: Date.now(),
    })
    set({ settings: { ...settings, hasKey } })
  },
  subscribe: (uid) => {
    return onSnapshot(doc(db, 'users', uid, 'settings', 'ai'), (snap) => {
      const data = snap.data()
      set({
        settings: data
          ? {
              provider: (data.provider as AIProvider) ?? 'claude',
              model: (data.model as string | null) ?? undefined,
              // hasKey covers new docs; the apiKey check covers pre-migration docs
              hasKey: data.hasKey === true || !!data.apiKey,
            }
          : emptySettings,
        loaded: true,
      })
    })
  },
}))
