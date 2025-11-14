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

const DEFAULT_REMOTE_REST = 'https://ftifto-backend.onrender.com/api/v1'

const resolveRemoteRest = () =>
  process.env.EXPO_PUBLIC_SERVER_REST_URL ??
  process.env.SERVER_REST_URL ??
  DEFAULT_REMOTE_REST

const resolveRemoteGraphql = (restUrl) =>
  ensureGraphqlPath(deriveHttpOrigin(restUrl))

const resolveRemoteWsGraphql = (restUrl) => {
  if (process.env.EXPO_PUBLIC_WS_GRAPHQL_URL) {
    return process.env.EXPO_PUBLIC_WS_GRAPHQL_URL
  }

  const baseSocket =
    process.env.EXPO_PUBLIC_SOCKET_URL ??
    process.env.SOCKET_URL

  if (baseSocket) {
    return ensureGraphqlPath(baseSocket)
  }

  const derivedWs = deriveHttpOrigin(restUrl).replace(/^https/, 'wss')
  return ensureGraphqlPath(derivedWs)
}

const LOCAL_GRAPHQL = 'https://ftifto-backend.onrender.com/graphql'
const LOCAL_WS_GRAPHQL = 'wss://ftifto-backend.onrender.com/graphql'
const LOCAL_REST = 'https://ftifto-backend.onrender.com/api/v1'

const REMOTE_REST = resolveRemoteRest()
const REMOTE_GRAPHQL =
  process.env.EXPO_PUBLIC_GRAPHQL_URL ??
  resolveRemoteGraphql(REMOTE_REST)
const REMOTE_WS_GRAPHQL = resolveRemoteWsGraphql(REMOTE_REST)

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
      GOOGLE_MAPS_KEY: configuration?.googleApiKey,
      EXPO_CLIENT_ID: configuration?.expoClientID,
      TERMS_AND_CONDITIONS: configuration?.termsAndConditions,
      PRIVACY_POLICY: configuration?.privacyPolicy,
      TEST_OTP: configuration?.testOtp
    }),
    [
      configuration?.androidClientID,
      configuration?.expoClientID,
      configuration?.googleApiKey,
      configuration?.iOSClientID,
      configuration?.privacyPolicy,
      configuration?.termsAndConditions,
      configuration?.testOtp
    ]
  )

  const useLocalBackend =
    __DEV__ && (configuration?.useLocalBackend === true || configuration?.backendMode === 'local')

  if (useLocalBackend) {
    return {
      GRAPHQL_URL: LOCAL_GRAPHQL,
      WS_GRAPHQL_URL: LOCAL_WS_GRAPHQL,
      SERVER_URL: LOCAL_GRAPHQL,
      SERVER_REST_URL: LOCAL_REST,
      ...shared
    }
  }

  return {
    GRAPHQL_URL: REMOTE_GRAPHQL,
    WS_GRAPHQL_URL: REMOTE_WS_GRAPHQL,
    SERVER_URL: REMOTE_GRAPHQL,
    SERVER_REST_URL: REMOTE_REST,
    ...shared
  }
}

export default useEnvVars
