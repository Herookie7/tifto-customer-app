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

      // Filter for active zones only
      const activeZones = fetchedZones.filter((zone) => zone.isActive !== false)
      console.log(`Processing ${activeZones.length} active zones from ${fetchedZones.length} total zones`)

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

        const locationType = zone.location.type

        // Handle Polygon type - coordinates should be [[[lng, lat], ...]]
        if (locationType === 'Polygon') {
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
        // Handle Point type - coordinates should be [lng, lat]
        else if (locationType === 'Point') {
          if (!Array.isArray(zone.location.coordinates) || zone.location.coordinates.length < 2) {
            console.warn(`Zone ${zone._id} (${zone.title}) point coordinates are invalid`)
            return false
          }
          const [lng, lat] = zone.location.coordinates
          if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
            console.warn(`Zone ${zone._id} (${zone.title}) point has invalid coordinates`)
            return false
          }
        }
        // If type is missing or unknown, try to infer from structure
        else if (!locationType) {
          console.warn(`Zone ${zone._id} (${zone.title}) has no location type, attempting to infer from structure`)
          // Try to handle as Polygon if structure matches
          if (Array.isArray(zone.location.coordinates[0]) && Array.isArray(zone.location.coordinates[0][0])) {
            // Looks like Polygon structure
            const points = zone.location.coordinates[0]
            if (Array.isArray(points) && points.length >= 3) {
              // Valid polygon structure, continue
            } else {
              return false
            }
          } else if (Array.isArray(zone.location.coordinates) && zone.location.coordinates.length === 2) {
            // Looks like Point structure
            const [lng, lat] = zone.location.coordinates
            if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
              return false
            }
          } else {
            console.warn(`Zone ${zone._id} (${zone.title}) has unknown location type: ${locationType}`)
            return false
          }
        } else {
          console.warn(`Zone ${zone._id} (${zone.title}) has unsupported location type: ${locationType}`)
          return false
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

      // Function to extract coordinates based on location type
      const extractCoordinates = (zone) => {
        const locationType = zone.location.type

        // Handle Point type - coordinates are directly [lng, lat]
        if (locationType === 'Point') {
          const [lng, lat] = zone.location.coordinates
          return { latitude: lat, longitude: lng }
        }

        // Handle Polygon type - calculate centroid
        if (locationType === 'Polygon' || (!locationType && Array.isArray(zone.location.coordinates[0]) && Array.isArray(zone.location.coordinates[0][0]))) {
          // Try to calculate centroid
          let centroid = calculateCentroid(zone.location.coordinates)

          // If centroid calculation failed, use fallback (first coordinate)
          if (!centroid) {
            console.warn(`Using fallback coordinate for zone ${zone._id} (${zone.title})`)
            centroid = getFallbackCoordinate(zone.location.coordinates)
          }

          return centroid
        }

        return null
      }

      // Calculate centroids for each zone with validation
      const centroids = activeZones
        .filter((zone) => {
          // Filter out zones with invalid coordinates
          return validateCoordinates(zone)
        })
        .map((zone) => {
          // Extract coordinates based on location type
          const coordinates = extractCoordinates(zone)

          // If extraction failed, skip this zone
          if (!coordinates) {
            console.error(`Cannot determine coordinates for zone ${zone._id} (${zone.title})`)
            return null
          }

          return {
            id: zone._id,
            name: zone.title,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
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

      console.log(`Processed ${centroids.length} valid cities from ${activeZones.length} active zones`)
      
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
        error,
        isConnected,
        permissionState,
        setPermissionState,
        refetch
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}
