import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import Constants from 'expo-constants'

// Get Firebase config from app.json extra (via Constants.expoConfig.extra)
const getFirebaseConfig = () => {
  const extra = Constants.expoConfig?.extra || {}
  return {
    apiKey: extra.FIREBASE_API_KEY || 'AIzaSyCmiC7sAVx5DjMPACwci-L74qww3uNxna4',
    authDomain: extra.FIREBASE_AUTH_DOMAIN || 'tifto-prod.firebaseapp.com',
    projectId: extra.FIREBASE_PROJECT_ID || 'tifto-prod',
    storageBucket: extra.FIREBASE_STORAGE_BUCKET || 'tifto-prod.firebasestorage.app',
    messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID || '253211113708',
    appId: extra.FIREBASE_APP_ID || '1:253211113708:android:8ae3bc83527d52b4698dc9',
    measurementId: extra.FIREBASE_MEASUREMENT_ID || ''
  }
}

const firebaseConfig = getFirebaseConfig()

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const firebaseAuth = getAuth(firebaseApp)

export { firebaseApp, firebaseAuth }
