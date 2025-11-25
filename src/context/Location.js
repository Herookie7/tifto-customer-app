import React, { createContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import gql from 'graphql-tag'
import { useQuery } from '@apollo/client'
import { getZones } from '../apollo/queries'
import NetInfo from '@react-native-community/netinfo'
// import * as Network from 'expo-network';

const GET_ZONES = gql`
  ${getZones}
`
export const LocationContext = createContext()

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null)
  const [cities, setCities] = useState([])
  const [permissionState, setPermissionState] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const { loading, error, data, refetch } = useQuery(GET_ZONES)

  useEffect(() => {
    if (location) {
      const saveLocation = async() => {
        await AsyncStorage.setItem('location', JSON.stringify(location))
      }

      saveLocation()
    }
  }, [location])

  useEffect(() => {
    const getActiveLocation = async() => {
      try {
        const locationStr = await AsyncStorage.getItem('location')
        if (locationStr) {
          setLocation(JSON.parse(locationStr))
        }
      } catch (err) {
        console.log(err)
      }
    }

    getActiveLocation()

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected) // Update connectivity status
    })

    return () => unsubscribe() // Clean up the listener
  }, [])

  // show zones as cities
  useEffect(() => {
    if (!loading && !error && data) {
      try {
        const fetchedZones = data.zones || []

        // Function to calculate centroid of a polygon
        const calculateCentroid = (coordinates) => {
          if (!coordinates || !coordinates[0] || !Array.isArray(coordinates[0])) {
            return null
          }

          let x = 0,
            y = 0,
            area = 0

          const points = coordinates[0] // Assuming the first array contains the coordinates

          for (let i = 0; i < points?.length - 1; i++) {
            const x0 = points[i][0]
            const y0 = points[i][1]
            const x1 = points[i + 1][0]
            const y1 = points[i + 1][1]
            const a = x0 * y1 - x1 * y0
            area += a
            x += (x0 + x1) * a
            y += (y0 + y1) * a
          }

          if (Math.abs(area) < 0.0001) {
            return null
          }

          area /= 2
          x = x / (6 * area)
          y = y / (6 * area)

          return { latitude: y, longitude: x }
        }

        // Calculate centroids for each zone
        const centroids = fetchedZones
          .filter((zone) => zone?.location?.coordinates)
          .map((zone) => {
            const centroid = calculateCentroid(zone.location.coordinates)
            if (!centroid) return null
            return {
              id: zone._id,
              name: zone.title,
              ...centroid,
              location: zone.location
            }
          })
          .filter(Boolean) // Remove null entries

        // Set this as the cities or the midpoint
        setCities(centroids)
      } catch (err) {
        console.error('LocationProvider: Error processing zones:', err)
        setCities([])
      }
    } else if (error) {
      console.error('LocationProvider: Error fetching zones:', error)
      setCities([])
    }
  }, [loading, error, data])
  useEffect(() => {
    if (isConnected) {
      refetch() // Refetch the data when the internet is back
    }
  }, [isConnected, refetch])

  return (
    <LocationContext.Provider
      value={{
        location,
        setLocation,
        cities,
        loading,
        isConnected,
        permissionState,
        setPermissionState
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}
