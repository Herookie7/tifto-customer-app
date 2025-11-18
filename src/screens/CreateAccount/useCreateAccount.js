import { useEffect, useState, useContext } from 'react'
import { StatusBar, Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import gql from 'graphql-tag'
import { login } from '../../apollo/mutations'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { useMutation } from '@apollo/client'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import analytics from '../../utils/analytics'
import AuthContext from '../../context/Auth'
import { useTranslation } from 'react-i18next'
import { useGoogleAuthRequest, processGoogleSignIn, signInGuest, signInWithEmail } from '../../services/authService'
import { decodeJwtToken } from '../../utils/decode-jwt'

const LOGIN = gql`
  ${login}
`

export const useCreateAccount = () => {
  const Analytics = analytics()
  const navigation = useNavigation()
  const { t, i18n } = useTranslation()
  const [mutate] = useMutation(LOGIN, { onCompleted, onError })
  const [enableApple, setEnableApple] = useState(false)
  const [loginButton, loginButtonSetter] = useState(null)
  const [loading, setLoading] = useState(false)
  const { setTokenAsync, setFirebaseTokenAsync } = useContext(AuthContext)
  const themeContext = useContext(ThemeContext)
  const [googleUser, setGoogleUser] = useState(null)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }

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

  // --- Common Navigation Functions ---
  const navigateToLogin = () => {
    navigation.navigate('Login')
  }

  const navigateToRegister = () => {
    navigation.navigate('Register')
  }

  const navigateToPhone = () => {
    navigation.navigate('PhoneNumber', {
      name: googleUser,
      phone: ''
    })
  }

  const navigateToMain = () => {
    navigation.navigate({
      name: 'Main',
      merge: true
    })
  }

  // --- Common Login Mutation Function ---
  async function mutateLogin(user) {
    try {
      console.log('🔐 [Login Debug] Starting login mutation for:', user.email)
      console.log('🔐 [Login Debug] User type:', user.type)
      console.log('🔐 [Login Debug] Full user object:', user)

      let notificationToken = null

      if (Device.isDevice) {
        try {
          const { status: existingStatus } = await Notifications.getPermissionsAsync()
          console.log('🔐 [Login Debug] Notification permission status:', existingStatus)

          if (existingStatus === 'granted') {
            try {
              const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId
              })
              notificationToken = tokenData.data
              console.log('🔐 [Login Debug] ✅ Got notification token')
            } catch (tokenError) {
              console.warn('🔐 [Login Debug] ⚠️ Could not get push token (this is OK):', tokenError.message)
              notificationToken = null
            }
          } else {
            console.log('🔐 [Login Debug] ℹ️ Notification permission not granted, skipping token')
          }
        } catch (permissionError) {
          console.warn('🔐 [Login Debug] ⚠️ Could not check notification permissions:', permissionError.message)
          notificationToken = null
        }
      } else {
        console.log('🔐 [Login Debug] ℹ️ Not a physical device, skipping notification token')
      }

      console.log('🔐 [Login Debug] About to call GraphQL mutation with variables:', {
        ...user,
        notificationToken: notificationToken ? 'token_present' : 'no_token'
      })

      mutate({
        variables: {
          ...user,
          notificationToken
        }
      })
    } catch (error) {
      console.error('🔐 [Login Debug] ❌ Error in mutateLogin:', error)
      setLoading(false)
      loginButtonSetter(null)
    }
  }

  // --- Common Apple Authentication Check ---
  useEffect(() => {
    checkIfSupportsAppleAuthentication()
  }, [])

  async function checkIfSupportsAppleAuthentication() {
    try {
      console.log('🍎 [Apple Debug] Checking Apple Authentication support...')
      console.log('🍎 [Apple Debug] Platform:', Platform.OS)

      const isAvailable = await AppleAuthentication.isAvailableAsync()
      console.log('🍎 [Apple Debug] Apple Authentication available:', isAvailable)

      setEnableApple(isAvailable)
    } catch (error) {
      console.error('🍎 [Apple Debug] ❌ Error checking Apple Authentication:', error)
      setEnableApple(false)
    }
  }

  // --- Common Login Success Handler ---
  async function onCompleted(data) {
    console.log('✅ [Login Debug] Login mutation completed successfully')
    console.log('✅ [Login Debug] Response data:', data)
    console.log('✅ [Login Debug] User email:', data.login.email)
    console.log('✅ [Login Debug] User active status:', data.login.isActive)
    console.log('✅ [Login Debug] User phone:', data.login.phone)

    if (data.login.isActive === false) {
      console.log('❌ [Login Debug] Account is deactivated')
      FlashMessage({ message: t('accountDeactivated') })
      setLoading(false)
      loginButtonSetter(null)
      return
    }

    try {
      console.log('✅ [Login Debug] Setting auth token...')
      setTokenAsync(data.login.token)
      FlashMessage({ message: 'Successfully logged in' })

      if (data?.login?.phone === '') {
        console.log('✅ [Login Debug] No phone number - navigating to phone screen')
        navigateToPhone()
      } else {
        console.log('✅ [Login Debug] Phone number exists - navigating to main app')
        navigateToMain()
      }
    } catch (error) {
      console.error('❌ [Login Debug] Error in onCompleted:', error)
    } finally {
      console.log('✅ [Login Debug] Resetting loading states')
      setLoading(false)
      loginButtonSetter(null)
    }
  }

  // --- Common Login Error Handler ---
  function onError(error) {
    console.error('❌ [Login Debug] Login mutation error occurred')
    console.error('❌ [Login Debug] Error message:', error.message)
    console.error('❌ [Login Debug] Full error object:', error)
    console.error('❌ [Login Debug] GraphQL errors:', error.graphQLErrors)
    console.error('❌ [Login Debug] Network error:', error.networkError)

    FlashMessage({
      message: error.message || 'Login failed. Please try again.'
    })

    setLoading(false)
    loginButtonSetter(null)
  }

  // --- Common Focus Effect for Status Bar ---
  useFocusEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(currentTheme.main)
    }
    StatusBar.setBarStyle(
      themeContext.ThemeValue === 'Dark' ? 'light-content' : 'dark-content'
    )
  })

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
    handleGuestSignIn
  }
}

