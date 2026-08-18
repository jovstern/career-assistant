import { create } from 'zustand'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Application, Stage } from '../types'

interface ApplicationsState {
  applications: Application[]
  loading: boolean
  subscribe: (uid: string) => () => void
  add: (uid: string, data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  update: (
    uid: string,
    id: string,
    data: Partial<
      Pick<
        Application,
        | 'stage'
        | 'notes'
        | 'skillGap'
        | 'interviewSteps'
        | 'contactEmail'
        | 'contactPhone'
        | 'workMode'
        | 'rejection'
      >
    >
  ) => Promise<void>
  remove: (uid: string, id: string) => Promise<void>
}

const appsCol = (uid: string) => collection(db, 'users', uid, 'applications')

export const useApplications = create<ApplicationsState>((set) => ({
  applications: [],
  loading: true,
  subscribe: (uid) => {
    const q = query(appsCol(uid), orderBy('updatedAt', 'desc'))
    return onSnapshot(q, (snap) => {
      set({
        applications: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application),
        loading: false,
      })
    })
  },
  add: async (uid, data) => {
    const now = Date.now()
    await addDoc(appsCol(uid), { ...data, createdAt: now, updatedAt: now })
  },
  update: async (uid, id, data) => {
    await updateDoc(doc(db, 'users', uid, 'applications', id), { ...data, updatedAt: Date.now() })
  },
  remove: async (uid, id) => {
    await deleteDoc(doc(db, 'users', uid, 'applications', id))
  },
}))

export type { Stage }
