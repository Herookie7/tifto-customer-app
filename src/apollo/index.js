import { useMemo } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
  split,
  concat,
  Observable
} from '@apollo/client'
import { getMainDefinition, offsetLimitPagination } from '@apollo/client/utilities'
import { WebSocketLink } from '@apollo/client/link/ws'

import useEnvVars from '../../environment'
import { calculateDistance } from '../utils/customFunctions'
import { firebaseAuth } from '../services/firebase'
import { getCachedAuthToken, setCachedAuthToken } from '../utils/authToken'

const getAuthorizationToken = async() => {
  try {
    const currentUser = firebaseAuth.currentUser
    if (currentUser) {
      const idToken = await currentUser.getIdToken()
      setCachedAuthToken(idToken)
      return idToken
    }
  } catch (error) {
    console.log('Unable to retrieve token from Firebase auth', error)
  }

  try {
    const storedFirebaseToken = await AsyncStorage.getItem('firebaseToken')
    if (storedFirebaseToken) {
      setCachedAuthToken(storedFirebaseToken)
      return storedFirebaseToken
    }
  } catch (error) {
    console.log('Unable to get stored Firebase token', error)
  }

  try {
    const legacyToken = await AsyncStorage.getItem('token')
    if (legacyToken) {
      setCachedAuthToken(legacyToken)
      return legacyToken
    }
  } catch (error) {
    console.log('Unable to get stored legacy token', error)
  }

  setCachedAuthToken(null)
  return null
}

const setupApollo = () => {
  const { GRAPHQL_URL, WS_GRAPHQL_URL } = useEnvVars()

  const cache = useMemo(
    () =>
      new InMemoryCache({
        typePolicies: {
          Query: {
            fields: {
              _id: {
                keyArgs: ['string']
              },
              orders: offsetLimitPagination()
            }
          },
          Category: {
            fields: {
              foods: {
                merge(_existing, incoming) {
                  return incoming
                }
              }
            }
          },
          Food: {
            fields: {
              variations: {
                merge(_existing, incoming) {
                  return incoming
                }
              }
            }
          },
          RestaurantPreview: {
            fields: {
              distanceWithCurrentLocation: {
                read(_existing, { variables, readField }) {
                  const restaurantLocation = readField('location')
                  const [latitude, longitude] = restaurantLocation?.coordinates ?? []
                  if (
                    typeof latitude !== 'number' ||
                    typeof longitude !== 'number' ||
                    typeof variables?.latitude !== 'number' ||
                    typeof variables?.longitude !== 'number'
                  ) {
                    return null
                  }
                  return calculateDistance(latitude, longitude, variables.latitude, variables.longitude)
                }
              },
              freeDelivery: {
                read() {
                  return Math.random() * 10 > 5
                }
              },
              acceptVouchers: {
                read() {
                  return Math.random() * 10 < 5
                }
              }
            }
          }
        }
      }),
    []
  )

  const client = useMemo(() => {
    const httpLink = createHttpLink({
      uri: GRAPHQL_URL
    })

    const wsLink = new WebSocketLink({
      uri: WS_GRAPHQL_URL,
      options: {
        reconnect: true,
        connectionParams: () => {
          const token = getCachedAuthToken()
          if (token) {
            return {
              Authorization: `Bearer ${token}`
            }
          }
          return {}
        }
      }
    })

    const authLink = new ApolloLink(
      (operation, forward) =>
        new Observable((observer) => {
          let handle
          Promise.resolve(getAuthorizationToken())
            .then((token) => {
              operation.setContext({
                headers: {
                  authorization: token ? `Bearer ${token}` : ''
                }
              })
              handle = forward(operation).subscribe({
                next: observer.next.bind(observer),
                error: observer.error.bind(observer),
                complete: observer.complete.bind(observer)
              })
            })
            .catch((error) => {
              observer.error(error)
            })

          return () => {
            if (handle) handle.unsubscribe()
          }
        })
    )

    const terminatingLink = split(({ query }) => {
      const definition = getMainDefinition(query)
      return definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
    }, wsLink)

    return new ApolloClient({
      link: concat(ApolloLink.from([terminatingLink, authLink]), httpLink),
      cache,
      resolvers: {}
    })
  }, [GRAPHQL_URL, WS_GRAPHQL_URL, cache])

  return client
}

export default setupApollo
