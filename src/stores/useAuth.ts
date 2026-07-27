import { create } from 'zustand'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

interface AuthState {
  user: User | null
  initializing: boolean
  signInGoogle: () => Promise<void>
  logOut: () => Promise<void>
}

export const useAuth = create<AuthState>(() => ({
  user: null,
  initializing: true,
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
