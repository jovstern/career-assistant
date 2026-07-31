import { create } from 'zustand'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export type AIProvider = 'claude' | 'gemini' | 'openai'

/**
 * The user's AI provider configuration. Client-visible fields only —
 * the API key itself is write-only (users/{uid}/secrets/ai).
 */
export interface AIProviderConfig {
  provider: AIProvider
  model?: string
  hasKey: boolean
}

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: 'claude-opus-5',
  gemini: 'gemini-2.5-pro',
  openai: 'gpt-5',
}

export const emptyConfig: AIProviderConfig = { provider: 'claude', hasKey: false }

interface AIProviderState {
  config: AIProviderConfig
  loaded: boolean
  save: (uid: string, config: Omit<AIProviderConfig, 'hasKey'>, newApiKey?: string) => Promise<void>
  subscribe: (uid: string) => () => void
}

export const useAIProvider = create<AIProviderState>((set, get) => ({
  config: emptyConfig,
  loaded: false,
  save: async (uid, config, newApiKey) => {
    const key = newApiKey?.trim()
    if (key) {
      await setDoc(doc(db, 'users', uid, 'secrets', 'ai'), { apiKey: key })
    }
    const hasKey = !!key || get().config.hasKey
    await setDoc(doc(db, 'users', uid, 'settings', 'ai'), {
      provider: config.provider,
      model: config.model ?? null,
      hasKey,
      updatedAt: Date.now(),
    })
    set({ config: { ...config, hasKey } })
  },
  subscribe: (uid) => {
    return onSnapshot(doc(db, 'users', uid, 'settings', 'ai'), (snap) => {
      const data = snap.data()
      set({
        config: data
          ? {
              provider: (data.provider as AIProvider) ?? 'claude',
              model: (data.model as string | null) ?? undefined,
              // hasKey covers new docs; the apiKey check covers pre-migration docs
              hasKey: data.hasKey === true || !!data.apiKey,
            }
          : emptyConfig,
        loaded: true,
      })
    })
  },
}))
