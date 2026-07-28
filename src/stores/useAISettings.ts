import { create } from 'zustand'
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export type AIProvider = 'claude' | 'gemini' | 'openai'

export interface AISettings {
  provider: AIProvider
  apiKey: string
  model?: string
}

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: 'claude-opus-5',
  gemini: 'gemini-2.5-pro',
  openai: 'gpt-5',
}

export const emptySettings: AISettings = { provider: 'claude', apiKey: '' }

interface AISettingsState {
  settings: AISettings
  loaded: boolean
  load: (uid: string) => Promise<void>
  save: (uid: string, settings: AISettings) => Promise<void>
  subscribe: (uid: string) => () => void
}

export const useAISettings = create<AISettingsState>((set) => ({
  settings: emptySettings,
  loaded: false,
  load: async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid, 'settings', 'ai'))
    set({ settings: snap.exists() ? (snap.data() as AISettings) : emptySettings, loaded: true })
  },
  save: async (uid, settings) => {
    await setDoc(doc(db, 'users', uid, 'settings', 'ai'), settings)
    set({ settings })
  },
  subscribe: (uid) => {
    return onSnapshot(doc(db, 'users', uid, 'settings', 'ai'), (snap) => {
      set({ settings: snap.exists() ? (snap.data() as AISettings) : emptySettings, loaded: true })
    })
  },
}))
