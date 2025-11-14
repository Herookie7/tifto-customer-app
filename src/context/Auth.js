import React, { useCallback, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { onAuthStateChanged } from 'firebase/auth'
import { firebaseAuth } from '../services/firebase'
import { setCachedAuthToken } from '../utils/authToken'

const STORAGE_KEYS = {
  LEGACY: 'token',
  FIREBASE: 'firebaseToken'
}

const AuthContext = React.createContext({
  token: null,
  firebaseToken: null,
  setTokenAsync: async() => {},
  setFirebaseTokenAsync: async() => {},
  clearAuthState: async() => {}
})

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null)
  const [firebaseToken, setFirebaseToken] = useState(null)

  const hydrateFromStorage = useCallback(async() => {
    try {
      const storedFirebaseToken = await AsyncStorage.getItem(STORAGE_KEYS.FIREBASE)
      if (storedFirebaseToken) {
        setFirebaseToken(storedFirebaseToken)
        setCachedAuthToken(storedFirebaseToken)
        return
      }

      const storedLegacyToken = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY)
      setToken(storedLegacyToken)
      if (storedLegacyToken) {
        setCachedAuthToken(storedLegacyToken)
      }
    } catch (error) {
      console.log('Failed to hydrate auth tokens', error)
    }
  }, [])

  useEffect(() => {
    hydrateFromStorage()
  }, [hydrateFromStorage])

  const setTokenAsync = useCallback(
    async(value) => {
      try {
        if (value) {
          await AsyncStorage.setItem(STORAGE_KEYS.LEGACY, value)
        } else {
          await AsyncStorage.removeItem(STORAGE_KEYS.LEGACY)
        }
        setToken(value)
        if (!firebaseToken) {
          setCachedAuthToken(value)
        }
      } catch (error) {
        console.log('Failed to persist legacy token', error)
      }
    },
    [firebaseToken]
  )

  const setFirebaseTokenAsync = useCallback(
    async(value) => {
      try {
        if (value) {
          await AsyncStorage.setItem(STORAGE_KEYS.FIREBASE, value)
          setFirebaseToken(value)
          setCachedAuthToken(value)
        } else {
          await AsyncStorage.removeItem(STORAGE_KEYS.FIREBASE)
          setFirebaseToken(null)
          setCachedAuthToken(token)
        }
      } catch (error) {
        console.log('Failed to persist Firebase token', error)
      }
    },
    [token]
  )

  const clearAuthState = useCallback(async() => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.LEGACY),
        AsyncStorage.removeItem(STORAGE_KEYS.FIREBASE)
      ])
    } catch (error) {
      console.log('Failed to clear stored auth tokens', error)
    } finally {
      setToken(null)
      setFirebaseToken(null)
      setCachedAuthToken(null)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async(user) => {
      if (user) {
        try {
          const refreshedToken = await user.getIdToken(true)
          await setFirebaseTokenAsync(refreshedToken)
        } catch (error) {
          console.log('Failed to refresh Firebase auth token', error)
        }
      } else {
        await setFirebaseTokenAsync(null)
      }
    })

    return unsubscribe
  }, [setFirebaseTokenAsync])

  const contextValue = useMemo(
    () => ({
      token,
      firebaseToken,
      setTokenAsync,
      setFirebaseTokenAsync,
      clearAuthState
    }),
    [token, firebaseToken, setTokenAsync, setFirebaseTokenAsync, clearAuthState]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const AuthConsumer = AuthContext.Consumer
export default AuthContext
