import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore, setLogLevel } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
})

export const auth = getAuth(app)
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true })
export const fns = getFunctions(app)
export const googleProvider = new GoogleAuthProvider()

// Local development against the Firebase Emulator Suite (npm run dev:emu).
// Every read/write then shows up plainly in the emulator UI at localhost:4000.
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectFunctionsEmulator(fns, '127.0.0.1', 5001)
  console.info('[firebase] using local emulators (auth:9099, firestore:8080, functions:5001)')
}

// Verbose Firestore logging (every listen/commit in the console): npm run dev:debug
if (import.meta.env.VITE_FIRESTORE_DEBUG === 'true') {
  setLogLevel('debug')
  console.info('[firebase] firestore debug logging enabled')
}
