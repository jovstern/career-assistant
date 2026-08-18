import { create } from 'zustand'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, fns } from '../lib/firebase'
import { useApplications } from './useApplications'

export interface JobMatch {
  id: string
  jobId: string
  jobTitle: string
  company: string
  location: string
  remote: 'remote' | 'hybrid' | 'onsite'
  url: string
  description: string
  salaryMin: number | null
  status: 'new' | 'added' | 'dismissed'
  createdAt: number
}

interface MatchesState {
  matches: JobMatch[]
  loading: boolean
  fetching: boolean
  error: string | null
  subscribe: (uid: string) => () => void
  fetchNow: () => Promise<{ found: number; newMatches: number }>
  addToBoard: (uid: string, match: JobMatch) => Promise<void>
  dismiss: (uid: string, match: JobMatch) => Promise<void>
}

export const useMatches = create<MatchesState>((set) => ({
  matches: [],
  loading: true,
  fetching: false,
  error: null,
  subscribe: (uid) => {
    const q = query(
      collection(db, 'users', uid, 'matches'),
      where('status', '==', 'new'),
      orderBy('createdAt', 'desc')
    )
    return onSnapshot(
      q,
      (snap) => {
        set({
          matches: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as JobMatch),
          loading: false,
          error: null,
        })
      },
      (err) => {
        set({ loading: false, error: err.message.replace('Firebase: ', '') })
      }
    )
  },
  fetchNow: async () => {
    set({ fetching: true })
    try {
      const fn = httpsCallable<void, { found: number; newMatches: number }>(
        fns,
        'fetchJobsNow'
      )
      const res = await fn()
      return res.data
    } finally {
      set({ fetching: false })
    }
  },
  addToBoard: async (uid, match) => {
    await useApplications.getState().add(uid, {
      company: match.company,
      jobTitle: match.jobTitle,
      location: match.location,
      url: match.url,
      description: match.description,
      stage: 'applied',
      notes: '',
      source: 'agent',
    })
    await updateDoc(doc(db, 'users', uid, 'matches', match.id), { status: 'added' })
  },
  dismiss: async (uid, match) => {
    await updateDoc(doc(db, 'users', uid, 'matches', match.id), { status: 'dismissed' })
  },
}))
