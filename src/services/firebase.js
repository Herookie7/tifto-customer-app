import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeAuth, getReactNativePersistence } from 'firebase/auth/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const firebaseConfig = {
  apiKey: 'AIzaSyAMItDFEjajieYjw7w0GyFCDqofJxDqBbI',
  authDomain: 'tifto-customer.firebaseapp.com',
  projectId: 'tifto-customer',
  storageBucket: 'tifto-customer.firebasestorage.app',
  messagingSenderId: '765681810225',
  appId: '1:765681810225:web:4a84cc5b6bfabbf80d8e10',
  measurementId: 'G-7WKMYV8WH4'
}

const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

let firebaseAuth

try {
  firebaseAuth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage)
  })
} catch (error) {
  firebaseAuth = getAuth(firebaseApp)
}

export { firebaseApp, firebaseAuth }
