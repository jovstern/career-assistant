import { create } from 'zustand'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

interface AuthState {
  user: User | null
  initializing: boolean
  signInEmail: (email: string, password: string) => Promise<void>
  signUpEmail: (email: string, password: string) => Promise<void>
  signInGoogle: () => Promise<void>
  logOut: () => Promise<void>
}

export const useAuth = create<AuthState>(() => ({
  user: null,
  initializing: true,
  signInEmail: async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password)
  },
  signUpEmail: async (email, password) => {
    await createUserWithEmailAndPassword(auth, email, password)
  },
  signInGoogle: async () => {
    await signInWithPopup(auth, googleProvider)
  },
  logOut: async () => {
    await signOut(auth)
  },
}))

onAuthStateChanged(auth, (user) => {
  useAuth.setState({ user, initializing: false })
})
