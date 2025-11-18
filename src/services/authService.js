import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut as firebaseSignOut } from 'firebase/auth'
import { firebaseAuth } from './firebase'
import Constants from 'expo-constants'

// Complete auth session for expo-auth-session
WebBrowser.maybeCompleteAuthSession()

/**
 * Get Firebase Web Client ID from app config
 */
const getFirebaseWebClientId = () => {
  const extra = Constants.expoConfig?.extra || {}
  return extra.FIREBASE_WEB_CLIENT_ID || '253211113708-2cu4ru93vr8aslbs2ut114bkgg1cfmfk.apps.googleusercontent.com'
}

/**
 * Hook to use Google Auth Request
 * This must be called at the component level, not inside a function
 */
export const useGoogleAuthRequest = () => {
  const webClientId = getFirebaseWebClientId()
  return Google.useAuthRequest({
    clientId: webClientId,
    scopes: ['profile', 'email', 'openid']
  })
}

/**
 * Sign in with Google using Expo Auth Session
 * This function processes the response from Google auth
 * Note: promptAsync must be called from a component using useGoogleAuthRequest hook
 */
export const processGoogleSignIn = async(response) => {
  try {
    if (response?.type === 'success') {
      const { id_token } = response.params
      
      if (!id_token) {
        throw new Error('No ID token received from Google')
      }

      // Create Firebase credential from Google ID token
      const credential = GoogleAuthProvider.credential(id_token)
      
      // Sign in to Firebase with Google credential
      const userCredential = await signInWithCredential(firebaseAuth, credential)
      
      return {
        success: true,
        user: userCredential.user,
        idToken: await userCredential.user.getIdToken()
      }
    } else if (response?.type === 'cancel') {
      return {
        success: false,
        error: 'User cancelled Google sign-in',
        cancelled: true
      }
    } else {
      return {
        success: false,
        error: response?.error?.message || 'Google sign-in failed'
      }
    }
  } catch (error) {
    console.error('Google sign-in error:', error)
    return {
      success: false,
      error: error.message || 'Google sign-in failed'
    }
  }
}

/**
 * Sign in with email and password
 */
export const signInWithEmail = async(email, password) => {
  try {
    const normalizedEmail = (email || '').trim().toLowerCase()
    
    if (!normalizedEmail || !password) {
      throw new Error('Email and password are required')
    }

    const userCredential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password)
    
    return {
      success: true,
      user: userCredential.user,
      idToken: await userCredential.user.getIdToken()
    }
  } catch (error) {
    console.error('Email sign-in error:', error)
    let errorMessage = 'Sign-in failed'
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email'
        break
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password'
        break
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address'
        break
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled'
        break
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later'
        break
      default:
        errorMessage = error.message || 'Sign-in failed'
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async(email, password) => {
  try {
    const normalizedEmail = (email || '').trim().toLowerCase()
    
    if (!normalizedEmail || !password) {
      throw new Error('Email and password are required')
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password)
    
    return {
      success: true,
      user: userCredential.user,
      idToken: await userCredential.user.getIdToken()
    }
  } catch (error) {
    console.error('Email sign-up error:', error)
    let errorMessage = 'Sign-up failed'
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'An account with this email already exists'
        break
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address'
        break
      case 'auth/weak-password':
        errorMessage = 'Password is too weak'
        break
      default:
        errorMessage = error.message || 'Sign-up failed'
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Sign in as guest (anonymous authentication)
 */
export const signInGuest = async() => {
  try {
    const userCredential = await signInAnonymously(firebaseAuth)
    
    return {
      success: true,
      user: userCredential.user,
      idToken: await userCredential.user.getIdToken(),
      isAnonymous: true
    }
  } catch (error) {
    console.error('Guest sign-in error:', error)
    return {
      success: false,
      error: error.message || 'Guest sign-in failed'
    }
  }
}

/**
 * Sign out current user
 */
export const signOutUser = async() => {
  try {
    await firebaseSignOut(firebaseAuth)
    return {
      success: true
    }
  } catch (error) {
    console.error('Sign-out error:', error)
    return {
      success: false,
      error: error.message || 'Sign-out failed'
    }
  }
}

