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
  const { loading, error, data, refetch } = useQuery(GET_ZONES, {
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    onError: (err) => {
      console.error('LocationProvider: GraphQL error fetching zones:', err);
      console.error('LocationProvider: Error details:', err.message, err.graphQLErrors, err.networkError);
    },
    onCompleted: (data) => {
      console.log('LocationProvider: Zones loaded successfully:', data?.zones?.length || 0, 'zones');
      if (data?.zones && data.zones.length > 0) {
        data.zones.forEach((zone, index) => {
          console.log(`LocationProvider: Zone ${index + 1}:`, {
            id: zone._id,
            title: zone.title,
            isActive: zone.isActive,
            hasLocation: !!zone.location,
            hasCoordinates: !!zone.location?.coordinates,
            coordinatesType: Array.isArray(zone.location?.coordinates) ? 'array' : typeof zone.location?.coordinates,
            locationType: zone.location?.type
          });
        });
      }
    }
  })

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
    if (error) {
      console.error('LocationProvider: Error loading zones, using empty cities array');
      setCities([]);
      return;
    }
    
    if (!loading && data?.zones) {
      try {
        // Filter only active zones
        const fetchedZones = (data.zones || []).filter(zone => zone.isActive === true)
        
        console.log('LocationProvider: Total zones from API:', data.zones?.length || 0);
        console.log('LocationProvider: Active zones:', fetchedZones.length);

        // Function to calculate centroid of a polygon
        const calculateCentroid = (coordinates) => {
          if (!coordinates || !coordinates[0] || coordinates[0].length < 3) {
            console.warn('LocationProvider: Invalid coordinates for centroid calculation');
            return { latitude: 0, longitude: 0 };
          }
          
          let x = 0
          let y = 0
          let area = 0

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
            console.warn('LocationProvider: Area too small for centroid calculation');
            return { latitude: points[0]?.[1] || 0, longitude: points[0]?.[0] || 0 };
          }

          area /= 2
          x = x / (6 * area)
          y = y / (6 * area)

          return { latitude: y, longitude: x }
        }

        // Calculate centroids for each zone
        const centroids = fetchedZones
          .filter(zone => {
            if (!zone?.location?.coordinates) {
              console.warn('LocationProvider: Zone missing location.coordinates:', zone._id, zone.title);
              return false;
            }
            // Check if coordinates is in the correct GeoJSON Polygon format
            if (!Array.isArray(zone.location.coordinates) || !zone.location.coordinates[0] || !Array.isArray(zone.location.coordinates[0])) {
              console.warn('LocationProvider: Zone coordinates not in Polygon format:', zone._id, zone.title, zone.location.coordinates);
              return false;
            }
            if (zone.location.coordinates[0].length < 3) {
              console.warn('LocationProvider: Zone coordinates need at least 3 points:', zone._id, zone.title);
              return false;
            }
            return true;
          })
          .map((zone) => {
            try {
              const centroid = calculateCentroid(zone.location.coordinates)
              if (!centroid || (centroid.latitude === 0 && centroid.longitude === 0)) {
                console.warn('LocationProvider: Invalid centroid calculated for zone:', zone._id, zone.title);
                return null;
              }
              return {
                id: zone._id,
                name: zone.title,
                ...centroid,
                location: zone.location
              }
            } catch (err) {
              console.error('LocationProvider: Error calculating centroid for zone:', zone._id, zone.title, err);
              console.error('LocationProvider: Zone location data:', JSON.stringify(zone.location, null, 2));
              return null;
            }
          })
          .filter(Boolean); // Remove null entries
        
        console.log('LocationProvider: Processed zones into cities:', centroids.length, 'cities from', fetchedZones.length, 'zones');
        if (centroids.length === 0 && fetchedZones.length > 0) {
          console.warn('LocationProvider: WARNING - No cities were created from zones. Check zone location format.');
          console.warn('LocationProvider: Sample zone data:', JSON.stringify(fetchedZones[0], null, 2));
        }

        // Set this as the cities or the midpoint
        setCities(centroids)
      } catch (err) {
        console.error('LocationProvider: Error processing zones data:', err);
        setCities([]);
      }
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
