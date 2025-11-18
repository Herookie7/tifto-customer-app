# Firebase Authentication Fixes - Required Changes

This document provides the specific code changes needed to fix the Firebase authentication issues identified in the verification report.

---

## Issue Summary

The platform-specific files (`useCreateAccount.android.js` and `useCreateAccount.ios.js`) are not using the centralized `authService` for Google authentication, which means users are not being authenticated with Firebase.

---

## Fix Option 1: Delete Platform-Specific Files (Recommended)

**Simplest solution:** Delete the platform-specific files and use the base `useCreateAccount.js` for all platforms.

### Steps:
1. Delete `src/screens/CreateAccount/useCreateAccount.android.js`
2. Delete `src/screens/CreateAccount/useCreateAccount.ios.js`
3. The base `useCreateAccount.js` already has the correct implementation using `authService`

**Why this works:** The base `useCreateAccount.js` uses `expo-auth-session` which works on both iOS and Android, and properly integrates with Firebase via `authService.processGoogleSignIn()`.

---

## Fix Option 2: Update Platform-Specific Files

If you need to keep platform-specific files, update them as follows:

---

## Fix for useCreateAccount.android.js

### Current Issues:
- Uses `@react-native-google-signin/google-signin` (wrong library)
- Does not authenticate with Firebase
- Does not use `authService`

### Required Changes:

#### 1. Update Imports

**Remove:**
```javascript
import { GoogleSignin } from '@react-native-google-signin/google-signin' // Android-specific Google import
```

**Add:**
```javascript
import { useGoogleAuthRequest, processGoogleSignIn, signInGuest } from '../../services/authService'
import * as WebBrowser from 'expo-web-browser'

WebBrowser.maybeCompleteAuthSession()
```

#### 2. Replace Google Sign-In Implementation

**Remove this entire section:**
```javascript
// Configure Google Sign-In ONCE for Android
useEffect(() => {
  console.log('🔧 Configuring Google Sign-In for Android...')
  GoogleSignin.configure({
    webClientId: '650001300965-9ochl634tuvv6iguei6dl57jkmfto6r9.apps.googleusercontent.com',
    androidClientId: '650001300965-ii3nafver2uiu4qat9gbde9rkmhmvj0j.apps.googleusercontent.com',
    iosClientId: '650001300965-dkji7jutv8gc5m4n7cdg3nft87sauhn7.apps.googleusercontent.com',
    offlineAccess: true,
    hostedDomain: '',
    forceCodeForRefreshToken: true
  })
  console.log('✅ Google Sign-In configured for Android')
}, [])

// Google Sign-In Function for Android
const signIn = async() => {
  try {
    console.log('🚀 Starting Google sign in (Android)...')
    loginButtonSetter('Google')
    setLoading(true)

    // Check for Google Play Services on Android
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices()
      console.log('✅ Google Play Services available')
    }

    const userInfo = await GoogleSignin.signIn()
    console.log('✅ Google sign-in successful!')
    console.log('👤 User:', userInfo.user.email)

    const userData = {
      phone: '',
      email: userInfo.user.email,
      password: '',
      name: userInfo.user.name,
      picture: userInfo.user.photo || '',
      type: 'google'
    }

    setGoogleUser(userInfo.user.name)
    console.log('🔐 Logging in user...')
    await mutateLogin(userData)
  } catch (error) {
    console.error('❌ Google sign-in error:', error)

    if (error.code === 'SIGN_IN_CANCELLED') {
      console.log('❌ User cancelled')
    } else if (error.code === 'IN_PROGRESS') {
      console.log('⏳ Sign in already in progress')
    } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      console.log('❌ Google Play Services not available')
      FlashMessage({ message: 'Google Play Services not available' })
    } else {
      FlashMessage({ message: 'Google sign in failed' })
    }

    setLoading(false)
    loginButtonSetter(null)
  }
}
```

**Replace with:**
```javascript
// Google Auth Request hook (works on both iOS and Android)
const [request, response, promptAsync] = useGoogleAuthRequest()

// Handle Google auth response
useEffect(() => {
  if (response?.type === 'success') {
    handleGoogleSignIn(response)
  } else if (response?.type === 'error') {
    console.error('Google authentication error:', response.error)
    FlashMessage({ message: `Google sign-in failed: ${response.error?.message || 'Unknown error'}` })
    setLoading(false)
    loginButtonSetter(null)
  } else if (response?.type === 'cancel') {
    FlashMessage({ message: 'Google sign-in cancelled.' })
    setLoading(false)
    loginButtonSetter(null)
  }
}, [response])

// Handle Google sign-in
const handleGoogleSignIn = async(response) => {
  try {
    setLoading(true)
    const result = await processGoogleSignIn(response)

    if (result.success) {
      // Get user info from Firebase
      const user = result.user
      const email = user.email || ''
      const name = user.displayName || ''
      const picture = user.photoURL || ''

      const userData = {
        phone: '',
        email,
        password: '',
        name,
        picture,
        type: 'google'
      }

      setGoogleUser(name)
      await mutateLogin(userData)
    } else {
      FlashMessage({ message: result.error || 'Google sign-in failed' })
      setLoading(false)
      loginButtonSetter(null)
    }
  } catch (error) {
    console.error('Google sign-in error:', error)
    FlashMessage({ message: 'Google sign-in failed' })
    setLoading(false)
    loginButtonSetter(null)
  }
}

// Google Sign-In Function
const signIn = async() => {
  try {
    console.log('🚀 Starting Google sign in...')
    loginButtonSetter('Google')
    setLoading(true)

    if (!request) {
      console.error('Google authentication request is not ready.')
      FlashMessage({ message: 'Google sign-in is not ready. Please try again.' })
      setLoading(false)
      loginButtonSetter(null)
      return
    }

    await promptAsync({
      useProxy: false
    })
  } catch (e) {
    console.error('Error during sign-in prompt:', e.message, e)
    FlashMessage({ message: 'Google sign-in failed unexpectedly.' })
    setLoading(false)
    loginButtonSetter(null)
  }
}

// Guest Sign-In Function
const handleGuestSignIn = async() => {
  try {
    loginButtonSetter('Guest')
    setLoading(true)

    const result = await signInGuest()

    if (result.success) {
      // Guest user - navigate to main app
      FlashMessage({ message: 'Signed in as guest' })
      navigation.navigate({
        name: 'Main',
        merge: true
      })
    } else {
      FlashMessage({ message: result.error || 'Guest sign-in failed' })
    }
  } catch (error) {
    console.error('Guest sign-in error:', error)
    FlashMessage({ message: 'Guest sign-in failed' })
  } finally {
    setLoading(false)
    loginButtonSetter(null)
  }
}
```

#### 3. Update Return Statement

**Add to return:**
```javascript
return {
  enableApple,
  loginButton,
  loginButtonSetter,
  loading,
  setLoading,
  themeContext,
  mutateLogin,
  currentTheme,
  navigateToLogin,
  navigateToRegister,
  navigateToMain,
  navigation,
  signIn,
  handleGuestSignIn  // Add this
}
```

---

## Fix for useCreateAccount.ios.js

### Current Issues:
- Uses `expo-auth-session` directly instead of `authService`
- Fetches user info from Google API instead of using Firebase
- Does not authenticate with Firebase

### Required Changes:

#### 1. Update Imports

**Remove:**
```javascript
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google' // iOS-specific Google import
WebBrowser.maybeCompleteAuthSession() // Important for Expo Auth Session
```

**Add:**
```javascript
import { useGoogleAuthRequest, processGoogleSignIn, signInGuest } from '../../services/authService'
import * as WebBrowser from 'expo-web-browser'

WebBrowser.maybeCompleteAuthSession()
```

#### 2. Replace Google Sign-In Implementation

**Remove this entire section:**
```javascript
// Google Auth Request for iOS (using expo-auth-session)
// Hardcoded client IDs as per your provided iOS code block
const [request, response, promptAsync] = Google.useAuthRequest({
  clientId: '650001300965-9ochl634tuvv6iguei6dl57jkmfto6r9.apps.googleusercontent.com', // Web client ID for Expo
  androidClientId: '650001300965-ii3nafver2uiu4qat9gbde9rkmhmvj0j.apps.googleusercontent.com', // Android client ID
  iosClientId: '650001300965-dkji7jutv8gc5m4n7cdg3nft87sauhn7.apps.googleusercontent.com', // iOS client ID
  scopes: ['profile', 'email', 'openid']
})

// Effect to handle the Google authentication response
useEffect(() => {
  if (response?.type === 'success') {
    const { authentication } = response
    fetchUserInfo(authentication.accessToken)
  } else if (response?.type === 'error') {
    console.error('Authentication error:', response.error)
    FlashMessage({ message: `Google sign-in failed: ${response.error.message || 'Unknown error'}` })
    setLoading(false)
    loginButtonSetter(null)
  } else if (response?.type === 'cancel') {
    FlashMessage({ message: 'Google sign-in cancelled.' })
    setLoading(false)
    loginButtonSetter(null)
  }
}, [response])

// Fetches user information from Google API after successful token acquisition
const fetchUserInfo = async(accessToken) => {
  try {
    const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const user = await response.json()

    const userData = {
      phone: '',
      email: user.email,
      password: '',
      name: user.name,
      picture: user.photo || '',
      type: 'google'
    }

    setGoogleUser(userData.name)
    await mutateLogin(userData)
  } catch (error) {
    console.error('❌ Google fetch user info error:', error)
    FlashMessage({ message: 'Failed to retrieve Google user info.' })
    setLoading(false)
    loginButtonSetter(null)
  }
}

// Google Sign-In Function for iOS
const signIn = async() => {
  try {
    loginButtonSetter('Google')
    setLoading(true)

    if (!request) {
      console.error('Google authentication request is not ready.')
      FlashMessage({ message: 'Google sign-in is not ready. Please try again.' })
      setLoading(false)
      loginButtonSetter(null)
      return
    }

    await promptAsync({
      useProxy: false, // Recommended for standalone apps
      windowFeatures: 'popup' // Not strictly needed for mobile but harmless
    })
  } catch (e) {
    console.error('Error during sign-in prompt: ' + e.message, e)
    FlashMessage({ message: 'Google sign-in failed unexpectedly.' })
    setLoading(false)
    loginButtonSetter(null)
  }
}
```

**Replace with:**
```javascript
// Google Auth Request hook (works on both iOS and Android)
const [request, response, promptAsync] = useGoogleAuthRequest()

// Handle Google auth response
useEffect(() => {
  if (response?.type === 'success') {
    handleGoogleSignIn(response)
  } else if (response?.type === 'error') {
    console.error('Google authentication error:', response.error)
    FlashMessage({ message: `Google sign-in failed: ${response.error?.message || 'Unknown error'}` })
    setLoading(false)
    loginButtonSetter(null)
  } else if (response?.type === 'cancel') {
    FlashMessage({ message: 'Google sign-in cancelled.' })
    setLoading(false)
    loginButtonSetter(null)
  }
}, [response])

// Handle Google sign-in
const handleGoogleSignIn = async(response) => {
  try {
    setLoading(true)
    const result = await processGoogleSignIn(response)

    if (result.success) {
      // Get user info from Firebase
      const user = result.user
      const email = user.email || ''
      const name = user.displayName || ''
      const picture = user.photoURL || ''

      const userData = {
        phone: '',
        email,
        password: '',
        name,
        picture,
        type: 'google'
      }

      setGoogleUser(name)
      await mutateLogin(userData)
    } else {
      FlashMessage({ message: result.error || 'Google sign-in failed' })
      setLoading(false)
      loginButtonSetter(null)
    }
  } catch (error) {
    console.error('Google sign-in error:', error)
    FlashMessage({ message: 'Google sign-in failed' })
    setLoading(false)
    loginButtonSetter(null)
  }
}

// Google Sign-In Function
const signIn = async() => {
  try {
    console.log('🚀 Starting Google sign in...')
    loginButtonSetter('Google')
    setLoading(true)

    if (!request) {
      console.error('Google authentication request is not ready.')
      FlashMessage({ message: 'Google sign-in is not ready. Please try again.' })
      setLoading(false)
      loginButtonSetter(null)
      return
    }

    await promptAsync({
      useProxy: false
    })
  } catch (e) {
    console.error('Error during sign-in prompt:', e.message, e)
    FlashMessage({ message: 'Google sign-in failed unexpectedly.' })
    setLoading(false)
    loginButtonSetter(null)
  }
}

// Guest Sign-In Function
const handleGuestSignIn = async() => {
  try {
    loginButtonSetter('Guest')
    setLoading(true)

    const result = await signInGuest()

    if (result.success) {
      // Guest user - navigate to main app
      FlashMessage({ message: 'Signed in as guest' })
      navigation.navigate({
        name: 'Main',
        merge: true
      })
    } else {
      FlashMessage({ message: result.error || 'Guest sign-in failed' })
    }
  } catch (error) {
    console.error('Guest sign-in error:', error)
    FlashMessage({ message: 'Guest sign-in failed' })
  } finally {
    setLoading(false)
    loginButtonSetter(null)
  }
}
```

#### 3. Update Return Statement

**Add to return:**
```javascript
return {
  enableApple,
  loginButton,
  loginButtonSetter,
  loading,
  setLoading,
  themeContext,
  mutateLogin,
  currentTheme,
  navigateToLogin,
  navigateToRegister,
  openTerms,
  openPrivacyPolicy,
  navigateToMain,
  navigation,
  signIn,
  handleGuestSignIn  // Add this
}
```

---

## Verification After Fix

After applying these fixes, verify:

1. ✅ Google sign-in on Android uses `authService.processGoogleSignIn()`
2. ✅ Google sign-in on iOS uses `authService.processGoogleSignIn()`
3. ✅ Both platforms authenticate with Firebase after Google sign-in
4. ✅ Firebase tokens are properly stored
5. ✅ Navigation works correctly after authentication

---

## Summary

**Recommended Approach:** Delete platform-specific files and use the base `useCreateAccount.js` which already has the correct implementation.

**Alternative Approach:** Update both platform-specific files to use `authService.processGoogleSignIn()` as shown above.

Both approaches will ensure that:
- ✅ Google authentication works on both iOS and Android
- ✅ Users are properly authenticated with Firebase
- ✅ Firebase tokens are stored correctly
- ✅ Code is consistent across platforms

