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
      const saveLocation = async () => {
        await AsyncStorage.setItem('location', JSON.stringify(location))
      }

      saveLocation()
    }
  }, [location])

  useEffect(() => {
    const getActiveLocation = async () => {
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
    if (error) {
      console.error('Error fetching zones:', error)
      console.error('Error details:', error.message, error.graphQLErrors, error.networkError)
      // Set empty cities array on error to prevent undefined state
      setCities([])
      return
    }

    if (!loading && data) {
      const fetchedZones = data.zones || []
      
      if (fetchedZones.length === 0) {
        console.warn('No zones found in the response')
        setCities([])
        return
      }

      console.log(`Processing ${fetchedZones.length} zones`)

      // Function to validate coordinates structure
      const validateCoordinates = (zone) => {
        // Check if zone has location
        if (!zone.location) {
          console.warn(`Zone ${zone._id} (${zone.title}) has no location property`)
          return false
        }

        // Check if coordinates exist
        if (!zone.location.coordinates) {
          console.warn(`Zone ${zone._id} (${zone.title}) has no coordinates`)
          return false
        }

        // Check if coordinates is an array
        if (!Array.isArray(zone.location.coordinates)) {
          console.warn(`Zone ${zone._id} (${zone.title}) coordinates is not an array`)
          return false
        }

        // For Polygon type, coordinates should be [[[lng, lat], ...]]
        if (zone.location.type === 'Polygon') {
          if (!Array.isArray(zone.location.coordinates[0])) {
            console.warn(`Zone ${zone._id} (${zone.title}) polygon coordinates[0] is not an array`)
            return false
          }

          const points = zone.location.coordinates[0]
          if (!Array.isArray(points) || points.length < 3) {
            console.warn(`Zone ${zone._id} (${zone.title}) polygon has insufficient points (${points?.length || 0})`)
            return false
          }

          // Validate each point has [lng, lat] structure
          for (let i = 0; i < points.length; i++) {
            if (!Array.isArray(points[i]) || points[i].length < 2) {
              console.warn(`Zone ${zone._id} (${zone.title}) point ${i} is invalid`)
              return false
            }
            const [lng, lat] = points[i]
            if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
              console.warn(`Zone ${zone._id} (${zone.title}) point ${i} has invalid coordinates`)
              return false
            }
          }
        }

        return true
      }

      // Function to calculate centroid of a polygon with error handling
      const calculateCentroid = (coordinates) => {
        try {
          // Validate coordinates structure
          if (!Array.isArray(coordinates) || !Array.isArray(coordinates[0])) {
            throw new Error('Invalid coordinates structure')
          }

          const points = coordinates[0]
          if (!Array.isArray(points) || points.length < 3) {
            throw new Error('Insufficient points for polygon')
          }

          let x = 0,
            y = 0,
            area = 0

          for (let i = 0; i < points.length - 1; i++) {
            const point0 = points[i]
            const point1 = points[i + 1]

            if (!Array.isArray(point0) || !Array.isArray(point1)) {
              throw new Error(`Invalid point structure at index ${i}`)
            }

            const x0 = point0[0]
            const y0 = point0[1]
            const x1 = point1[0]
            const y1 = point1[1]

            // Validate coordinates are numbers
            if (typeof x0 !== 'number' || typeof y0 !== 'number' || 
                typeof x1 !== 'number' || typeof y1 !== 'number' ||
                isNaN(x0) || isNaN(y0) || isNaN(x1) || isNaN(y1)) {
              throw new Error(`Invalid coordinate values at index ${i}`)
            }

            const a = x0 * y1 - x1 * y0
            area += a
            x += (x0 + x1) * a
            y += (y0 + y1) * a
          }

          area /= 2

          // Check for division by zero
          if (Math.abs(area) < 1e-10) {
            throw new Error('Area too small, cannot calculate centroid')
          }

          x = x / (6 * area)
          y = y / (6 * area)

          // Validate calculated values
          if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
            throw new Error('Calculated centroid is invalid')
          }

          return { latitude: y, longitude: x }
        } catch (error) {
          console.warn('Centroid calculation failed:', error.message)
          return null
        }
      }

      // Function to get fallback coordinate (first point of polygon)
      const getFallbackCoordinate = (coordinates) => {
        try {
          if (!Array.isArray(coordinates) || !Array.isArray(coordinates[0])) {
            return null
          }

          const points = coordinates[0]
          if (!Array.isArray(points) || points.length === 0) {
            return null
          }

          const firstPoint = points[0]
          if (!Array.isArray(firstPoint) || firstPoint.length < 2) {
            return null
          }

          const [lng, lat] = firstPoint
          if (typeof lng !== 'number' || typeof lat !== 'number' || 
              isNaN(lng) || isNaN(lat)) {
            return null
          }

          return { latitude: lat, longitude: lng }
        } catch (error) {
          console.warn('Fallback coordinate extraction failed:', error.message)
          return null
        }
      }

      // Calculate centroids for each zone with validation
      const centroids = fetchedZones
        .filter((zone) => {
          // Filter out zones with invalid coordinates
          return validateCoordinates(zone)
        })
        .map((zone) => {
          // Try to calculate centroid
          let centroid = calculateCentroid(zone.location.coordinates)

          // If centroid calculation failed, use fallback (first coordinate)
          if (!centroid) {
            console.warn(`Using fallback coordinate for zone ${zone._id} (${zone.title})`)
            centroid = getFallbackCoordinate(zone.location.coordinates)
          }

          // If both failed, skip this zone
          if (!centroid) {
            console.error(`Cannot determine coordinates for zone ${zone._id} (${zone.title})`)
            return null
          }

          return {
            id: zone._id,
            name: zone.title,
            latitude: centroid.latitude,
            longitude: centroid.longitude,
            location: zone.location
          }
        })
        .filter((city) => {
          // Filter out null entries and validate latitude/longitude are valid numbers
          if (!city) return false
          const { latitude, longitude } = city
          return (
            typeof latitude === 'number' &&
            typeof longitude === 'number' &&
            !isNaN(latitude) &&
            !isNaN(longitude) &&
            isFinite(latitude) &&
            isFinite(longitude)
          )
        })

      console.log(`Processed ${centroids.length} valid cities from ${fetchedZones.length} zones`)
      
      if (centroids.length === 0) {
        console.warn('No valid cities could be processed from zones')
      }
      
      // Set this as the cities or the midpoint
      setCities(centroids)
    } else if (!loading && !data) {
      console.warn('No data received from zones query')
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
