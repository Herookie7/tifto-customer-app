import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import Constants from 'expo-constants'

// Get Firebase config from app.json extra.firebase (via Constants.expoConfig.extra)
const getFirebaseConfig = () => {
  const extra = Constants.expoConfig?.extra || {}
  const firebase = extra.firebase || {}
  return {
    apiKey: firebase.apiKey || 'AIzaSyCmiC7sAVx5DjMPACwci-L74qww3uNxna4',
    authDomain: firebase.authDomain || 'tifto-prod.firebaseapp.com',
    projectId: firebase.projectId || 'tifto-prod',
    storageBucket: firebase.storageBucket || 'tifto-prod.firebasestorage.app',
    messagingSenderId: firebase.messagingSenderId || '253211113708',
    appId: firebase.appId || '1:253211113708:android:8ae3bc83527d52b4698dc9',
    measurementId: firebase.measurementId || ''
  }
}

const firebaseConfig = getFirebaseConfig()

let firebaseApp
let firebaseAuth

try {
  firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  firebaseAuth = getAuth(firebaseApp)
  console.log('Firebase initialized successfully')
  console.log('Firebase project:', firebaseConfig.projectId)
} catch (error) {
  console.error('Firebase initialization error:', error)
  console.error('Firebase config used:', JSON.stringify(firebaseConfig, null, 2))
  // Initialize with fallback to prevent app crash
  // The error will be visible in logs and can be handled by components
  try {
    firebaseApp = getApps()[0] || initializeApp(firebaseConfig)
    firebaseAuth = getAuth(firebaseApp)
  } catch (fallbackError) {
    console.error('Firebase fallback initialization also failed:', fallbackError)
  }
}

export { firebaseApp, firebaseAuth }
