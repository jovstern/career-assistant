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
import type { GrowthItem } from '../types'

interface GrowthItemsState {
  items: GrowthItem[]
  loading: boolean
  subscribe: (uid: string) => () => void
  add: (
    uid: string,
    data: Pick<GrowthItem, 'title' | 'notes' | 'priority'> & { relatedApplicationIds?: string[] }
  ) => Promise<void>
  update: (
    uid: string,
    id: string,
    data: Partial<Pick<GrowthItem, 'title' | 'notes' | 'priority' | 'done' | 'suggestedActions'>>
  ) => Promise<void>
  remove: (uid: string, id: string) => Promise<void>
}

const growthCol = (uid: string) => collection(db, 'users', uid, 'growthItems')

export const useGrowthItems = create<GrowthItemsState>((set) => ({
  items: [],
  loading: true,
  subscribe: (uid) => {
    const q = query(growthCol(uid), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      set({
        items: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GrowthItem),
        loading: false,
      })
    })
  },
  add: async (uid, data) => {
    const now = Date.now()
    const { relatedApplicationIds, ...rest } = data
    await addDoc(growthCol(uid), {
      ...rest,
      source: 'manual',
      relatedApplicationIds: relatedApplicationIds ?? [],
      done: false,
      createdAt: now,
      updatedAt: now,
    })
  },
  update: async (uid, id, data) => {
    await updateDoc(doc(db, 'users', uid, 'growthItems', id), { ...data, updatedAt: Date.now() })
  },
  remove: async (uid, id) => {
    await deleteDoc(doc(db, 'users', uid, 'growthItems', id))
  },
}))
