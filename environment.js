// /*****************************
//  * environment.js
//  * path: '/environment.js' (root of your project)
//  ******************************/

import { useContext, useMemo } from 'react'
import * as Updates from 'expo-updates'
import ConfigurationContext from './src/context/Configuration'

const ensureTrailingSlash = (value) =>
  value.endsWith('/') ? value : `${value}/`

const deriveHttpOrigin = (restUrl) =>
  ensureTrailingSlash(restUrl.replace(/\/api(?:\/v\d+)?\/?$/, '/'))

const ensureGraphqlPath = (value) =>
  value.endsWith('graphql') ? value : `${ensureTrailingSlash(value)}graphql`

const REST_BASE_URL = 'https://ftifto-backend.onrender.com/api/v1'
const GRAPHQL_URL = 'https://ftifto-backend.onrender.com/graphql'
const WS_GRAPHQL_URL = 'wss://ftifto-backend.onrender.com/graphql'

const resolveRemoteRest = () =>
  process.env.EXPO_PUBLIC_SERVER_REST_URL ??
  process.env.SERVER_REST_URL ??
  REST_BASE_URL

const resolveRemoteGraphql = () =>
  process.env.EXPO_PUBLIC_GRAPHQL_URL ??
  GRAPHQL_URL

const resolveRemoteWsGraphql = () => {
  if (process.env.EXPO_PUBLIC_WS_GRAPHQL_URL) {
    return process.env.EXPO_PUBLIC_WS_GRAPHQL_URL
  }

  if (process.env.EXPO_PUBLIC_SOCKET_URL || process.env.SOCKET_URL) {
    const baseSocket = process.env.EXPO_PUBLIC_SOCKET_URL ?? process.env.SOCKET_URL
    return ensureGraphqlPath(baseSocket)
  }

  return WS_GRAPHQL_URL
}

const REMOTE_REST = resolveRemoteRest()
const REMOTE_GRAPHQL = resolveRemoteGraphql()
const REMOTE_WS_GRAPHQL = resolveRemoteWsGraphql()

const PRODUCTION_CHANNELS = ['production', 'staging', 'preview']

const resolveChannel = () => {
  if (typeof Updates?.channel === 'string') {
    return Updates.channel
  }
  if (typeof Updates?.releaseChannel === 'string') {
    return Updates.releaseChannel
  }
  return 'production'
}

export const isProduction = () => {
  if (__DEV__) {
    return false
  }
  return PRODUCTION_CHANNELS.includes(resolveChannel())
}

const useEnvVars = () => {
  const configuration = useContext(ConfigurationContext)
  const shared = useMemo(
    () => ({
      IOS_CLIENT_ID_GOOGLE: configuration?.iOSClientID,
      ANDROID_CLIENT_ID_GOOGLE: configuration?.androidClientID,
      AMPLITUDE_API_KEY: configuration?.appAmplitudeApiKey,
      GOOGLE_MAPS_KEY: configuration?.googleApiKey,
      EXPO_CLIENT_ID: configuration?.expoClientID,
      SENTRY_DSN: configuration?.customerAppSentryUrl ?? 'https://4213c02977911e1b75898c93cc5517fb@o1103026.ingest.us.sentry.io/4508662470803456',
      TERMS_AND_CONDITIONS: configuration?.termsAndConditions,
      PRIVACY_POLICY: configuration?.privacyPolicy,
      TEST_OTP: configuration?.testOtp,
      GOOGLE_PACES_API_BASE_URL: configuration?.googlePlacesApiBaseUrl
    }),
    [
      configuration?.androidClientID,
      configuration?.appAmplitudeApiKey,
      configuration?.customerAppSentryUrl,
      configuration?.expoClientID,
      configuration?.googleApiKey,
      configuration?.googlePlacesApiBaseUrl,
      configuration?.iOSClientID,
      configuration?.privacyPolicy,
      configuration?.termsAndConditions,
      configuration?.testOtp
    ]
  )

  // Always use production URLs - no localhost fallback
  return {
    GRAPHQL_URL: REMOTE_GRAPHQL,
    WS_GRAPHQL_URL: REMOTE_WS_GRAPHQL,
    SERVER_URL: REMOTE_GRAPHQL,
    SERVER_REST_URL: REMOTE_REST,
    REST_BASE_URL: REMOTE_REST,
    ...shared
  }
}

export default useEnvVars
