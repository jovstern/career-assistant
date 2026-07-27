import { create } from 'zustand'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { UserProfile } from '../types'

export const emptyProfile: UserProfile = {
  name: '',
  title: '',
  seniority: 'mid',
  skills: [],
  preferences: { roles: [], locations: [], remote: 'any' },
}

interface ProfileState {
  profile: UserProfile
  loaded: boolean
  load: (uid: string) => Promise<void>
  save: (uid: string, profile: UserProfile) => Promise<void>
}

export const useProfile = create<ProfileState>((set) => ({
  profile: emptyProfile,
  loaded: false,
  load: async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid))
    set({ profile: snap.exists() ? (snap.data() as UserProfile) : emptyProfile, loaded: true })
  },
  save: async (uid, profile) => {
    await setDoc(doc(db, 'users', uid), profile)
    set({ profile })
  },
}))
