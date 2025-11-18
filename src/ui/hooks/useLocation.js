import * as Location from 'expo-location'
import { getLocationFromStorage } from './useWatchLocation'
import { getSafeLocation } from '../../services/location'

export default function useLocation() {
  const getLocationPermission = async() => {
    const {
      status,
      canAskAgain
    } = await Location.getForegroundPermissionsAsync()
    return { status, canAskAgain }
  }

  const askLocationPermission = async() => {
    let finalStatus = null
    let finalCanAskAgain = null
    const {
      status: currentStatus,
      canAskAgain: currentCanAskAgain
    } = await Location.getForegroundPermissionsAsync()
    finalStatus = currentStatus === 'granted' ? 'granted' : 'denied'
    finalCanAskAgain = currentCanAskAgain
    if (currentStatus === 'granted') {
      return { status: finalStatus, canAskAgain: finalCanAskAgain }
    }
    if (currentCanAskAgain) {
      const {
        status,
        canAskAgain
      } = await Location.requestForegroundPermissionsAsync()
      finalStatus = status === 'granted' ? 'granted' : 'denied'
      finalCanAskAgain = canAskAgain
      if (status === 'granted') {
        return { status: finalStatus, canAskAgain: finalCanAskAgain }
      }
    }
    return { status: finalStatus, canAskAgain: finalCanAskAgain }
  }

  const getCurrentLocation = async() => {
    const location = await getLocationFromStorage()
    if (location) {
      if (!location || !location.latitude || !location.longitude) {
        return { error: true, message: 'LocationUnavailable', coords: { latitude: 0, longitude: 0 } }
      }
      return { coords: location, error: false }
    }
    const { status } = await askLocationPermission()

    if (status === 'granted') {
      try {
        const location = await getSafeLocation()
        if (!location || !location.coords) {
          return { error: true, message: 'LocationUnavailable', coords: { latitude: 0, longitude: 0 } }
        }
        return { ...location, error: false }
      } catch (e) {
        console.log('location error', e)
        return { error: true, message: e.message, coords: { latitude: 0, longitude: 0 } }
      }
    }
    return { error: true, message: 'Location permission was not granted', coords: { latitude: 0, longitude: 0 } }
  }

  return { getCurrentLocation, getLocationPermission }
}
