import React, { useContext, useEffect, useState } from 'react'
import { View, TouchableOpacity, Linking, Platform, StatusBar, ActivityIndicator, Text, StyleSheet, Alert } from 'react-native'
import { useLocation } from '../../ui/hooks'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import styles from './styles'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import analytics from '../../utils/analytics'
import { useTranslation } from 'react-i18next'
import MapView, { PROVIDER_DEFAULT, Polygon, Marker } from 'react-native-maps'
import { customMapStyle } from '../../utils/customMapStyles'
import ModalDropdown from '../../components/Picker/ModalDropdown'
import { LocationContext } from '../../context/Location'
import markerIcon from '../../../assets/Group1000003768.png'
import CustomMarkerWithLabel from '../../assets/SVG/imageComponents/CustomMarkerWithLabel'
import useGeocoding from '../../ui/hooks/useGeocoding'
import Spinner from '../../components/Spinner/Spinner'
import ForceUpdate from '../../components/Update/ForceUpdate'
import { checkLocationInCities } from '../../utils/locationUtil'

import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'
import useWatchLocation from '../../ui/hooks/useWatchLocation'

export default function CurrentLocation() {
  const Analytics = analytics()
  const { permission, onRequestPermission } = useWatchLocation()
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [isCheckingZone, setIsCheckingZone] = useState(false)
  const navigation = useNavigation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const { getCurrentLocation, getLocationPermission } = useLocation()
  const [citiesModalVisible, setCitiesModalVisible] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const { getAddress } = useGeocoding()

  const { cities, setLocation, permissionState, setPermissionState } = useContext(LocationContext)

  const checkLocationPermission = async () => {
    try {
    setLoading(true)
    const { status, canAskAgain } = await getLocationPermission()

    if (status === 'granted') {
      setLoading(false)
        // Don't navigate immediately - let getCurrentLocationOnStart handle it
        // navigation.replace('Main')
    } else if (status === 'denied') {
      // Permission denied but can ask again
      // Show the Allow Location screen
        setLoading(false)
    } else if (status === 'blocked') {
      Alert.alert('Location Permission Blocked', 'Please enable location services in your device settings.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ])
      setLoading(false)
    } else {
      if (status !== 'granted' && !canAskAgain) {
        FlashMessage({
            message: t('locationPermissionMessage') || 'Location permission is required to use this app.',
          onPress: async () => {
            await Linking.openSettings()
          }
        })
        setLoading(false)
        return
      }
        setLoading(false)
      }
    } catch (error) {
      console.error('Error checking location permission:', error)
      setLoading(false)
    }
  }

  const filterCities = () => {
    let newCities = cities?.filter((city) => !isNaN(city.latitude) && !isNaN(city.longitude))
    return newCities
  }

  const handleMarkerPress = async (coordinates) => {
    try {
      setCitiesModalVisible(false)
      setIsCheckingZone(true)
      
      // Validate coordinates structure
      if (!coordinates || typeof coordinates !== 'object') {
        console.error('Invalid coordinates object:', coordinates)
        setIsCheckingZone(false)
        FlashMessage({
          message: t('invalidLocation') || 'Invalid location selected.'
        })
        return
      }

      // Validate coordinate values
      const { latitude, longitude } = coordinates
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
          isNaN(latitude) || isNaN(longitude) || 
          !isFinite(latitude) || !isFinite(longitude)) {
        console.error('Invalid coordinate values:', { latitude, longitude })
        setIsCheckingZone(false)
        FlashMessage({
          message: t('invalidLocation') || 'Invalid location selected.'
        })
        return
      }

      // Check network connectivity
      if (!connect) {
        setIsCheckingZone(false)
        FlashMessage({
          message: t('noInternetConnection') || 'No internet connection. Please check your network and try again.'
        })
        return
      }

      // Get address using geocoding
      const response = await getAddress(latitude, longitude)
      
      if (!response || !response.formattedAddress) {
        console.error('Failed to get address - empty response')
        setIsCheckingZone(false)
        FlashMessage({
          message: t('unableToGetAddress') || 'Unable to get address for selected location.'
        })
        return
      }

      // Set location with validated data
      setLocation({
        label: 'Location',
        deliveryAddress: response.formattedAddress,
        latitude: latitude,
        longitude: longitude,
        city: response.city || null
      })
      
      setTimeout(() => {
        setIsCheckingZone(false)
        if (navigation) {
          navigation.navigate('Main')
        }
      }, 100)
    } catch (error) {
      console.error('Error in handleMarkerPress:', error)
      setIsCheckingZone(false)
      // Use the error message from getAddress if available, otherwise use default
      const errorMessage = error?.message || t('errorSelectingLocation') || 'Error selecting location. Please try again.'
      FlashMessage({
        message: errorMessage
      })
    }
  }

  async function checkCityMatch(new_location = null) {
    try {
    console.log('calling checkCityMatch', new_location)
    const cl_p = new_location || currentLocation
      if (!cl_p || !cities || cities.length === 0) {
        console.log('No location or cities available for matching')
        return
      }

    setIsCheckingZone(true)

      const filteredCities = filterCities()
      if (!filteredCities || filteredCities.length === 0) {
        console.log('No valid cities after filtering')
        setIsCheckingZone(false)
        return
      }

      const matchingCity = checkLocationInCities(cl_p, filteredCities)
    if (matchingCity) {
      try {
        const response = await getAddress(cl_p.latitude, cl_p.longitude)
          console.log("Fetched Address Data:", response);
          
          if (!response || !response.formattedAddress) {
            console.error('Failed to get address')
            setIsCheckingZone(false)
            return
          }

        const locationData = {
          label: 'Location',
          deliveryAddress: response.formattedAddress,
          latitude: cl_p.latitude,
          longitude: cl_p.longitude,
          city: response.city
        }

        setLocation(locationData)
        setTimeout(() => {
          setIsCheckingZone(false)
            if (navigation) {
          navigation.navigate('Main')
            }
        }, 100)
      } catch (error) {
          console.error('Error getting address:', error)
          setIsCheckingZone(false)
        }
      } else {
        console.log("No matching city found for this location.");
        setIsCheckingZone(false)
      }
    } catch (error) {
      console.error('Error in checkCityMatch:', error)
      setIsCheckingZone(false)
    }
  }

  async function getCurrentLocationOnStart() {
    console.log('calling getCurrentLocationOnStart', permissionState)
    setLoading(true)

    try {
    // Handle permission request result
      if (!permissionState) {
        setLoading(false)
        return
      }

    if (!permissionState?.granted) {
      console.log('Location permission not granted')
        setLoading(false)
      return
    }

    // Permission is granted, continue with location logic
    const { error, coords } = await getCurrentLocation()

    if (error) {
        console.log("Location error:", error)
        FlashMessage({
          message: error?.message || t('unableToGetLocation') || 'Unable to get your current location. Please try again.'
        })
        setLoading(false)
        return
      }

      if (!coords || !coords.latitude || !coords.longitude) {
        console.error('Invalid coordinates:', coords)
      setLoading(false)
      return
    }

      console.log("Fetched Location:", coords);
    const userLocation = {
      latitude: coords.latitude,
      longitude: coords.longitude
    }

    setCurrentLocation(userLocation)
      setLoading(false)
    } catch (error) {
      console.error('Error in getCurrentLocationOnStart:', error)
    setLoading(false)
    }
  }

  async function onRequestPermissionHandler() {
    const permission_response = await onRequestPermission()

    setPermissionState(permission_response)


    // ❌ Permanently denied (cannot ask again)
    if (!permission_response?.canAskAgain) {
      // Optionally prompt user to open settings
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:') // iOS deep link to app settings
      } else {
        Linking.openSettings() // Android
      }

      return
    }
  }

  useEffect(() => {
    async function Track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_CURRENTLOCATION)
    }
    Track()
    checkLocationPermission()
  }, [])

  useFocusEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(currentTheme.white)
    }
    StatusBar.setBarStyle('dark-content')
  })

  useEffect(() => {
    getCurrentLocationOnStart()
  }, [permissionState, permission])

  useEffect(() => {
    checkCityMatch()
  }, [currentLocation, cities])

  // Add a small delay to prevent flashing of permission screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false)
    }, 1000) // Wait 1 second before showing permission screen

    return () => clearTimeout(timer)
  }, [])

  const initialRegion = {
    latitude: 24.0667,
    longitude: 75.0833,
    latitudeDelta: 130,
    longitudeDelta: 130
  }

  const { isConnected: connect, setIsConnected: setConnect } = useNetworkStatus()
  if (!connect) return <ErrorView refetchFunctions={[]} />

  return !currentLocation && !isInitialLoading ? (
    <View style={[allowedLocationStyles.container, { backgroundColor: currentTheme.themeBackground }]}>
      <Text style={allowedLocationStyles.title}>Enable Location Services</Text>
      <Text style={allowedLocationStyles.description}>We need access to your location to show nearby restaurants and provide accurate delivery services.</Text>
      <TouchableOpacity style={allowedLocationStyles.button} onPress={onRequestPermissionHandler}>
        <Text style={allowedLocationStyles.buttonText}>Allow Location Access</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View
      style={[
        styles().flex,
        {
          backgroundColor: currentTheme.themeBackground
        }
      ]}
    >
      <View style={[styles().flex, styles(currentTheme).screenBackground]}>
        <View style={styles().mapView}>
          <MapView style={styles().flex} provider={PROVIDER_DEFAULT} customMapStyle={customMapStyle} region={initialRegion}>
            {currentLocation && <Marker coordinate={currentLocation} onPress={() => handleMarkerPress(currentLocation)} />}

            {filterCities()?.map((city) => (
              <React.Fragment key={city?.id}>
                <CustomMarkerWithLabel
                  coordinate={{
                    latitude: city?.latitude,
                    longitude: city?.longitude
                  }}
                  label={city?.name}
                  icon={markerIcon}
                  currentTheme={currentTheme}
                  onPress={() =>
                    handleMarkerPress({
                      latitude: city?.latitude,
                      longitude: city?.longitude
                    })
                  }
                />

                {city?.location && city?.location?.coordinates && city?.location?.coordinates[0] && (
                  <Polygon
                    coordinates={city?.location?.coordinates[0].map((coord) => ({
                      latitude: coord[1],
                      longitude: coord[0]
                    }))}
                    strokeColor={currentTheme.orderComplete}
                    fillColor={currentTheme.radiusFill}
                    strokeWidth={2}
                  />
                )}
              </React.Fragment>
            ))}
          </MapView>
        </View>

        <View style={styles(currentTheme).subContainerImage}>
          {loading && <Spinner spinnerColor={currentTheme.spinnerColor} backColor={currentTheme.themeBackground} />}
          <TextDefault textColor={currentTheme.fontMainColor} center bolder H2 style={styles(currentTheme).welcomeHeading}>
            {t('welcomeScreen')}
          </TextDefault>
          <TextDefault textColor={currentTheme.fontMainColor} bold center style={styles(currentTheme).descriptionEmpty}>
            {t('tiftoUseYourLocationMessage')}
          </TextDefault>

          <TouchableOpacity activeOpacity={0.7} style={styles(currentTheme).linkButton} onPress={() => setCitiesModalVisible(true)}>
            <TextDefault textColor={currentTheme.fontMainColor} H5 center>
              {t('exploreYallaCities')}
            </TextDefault>
          </TouchableOpacity>
        </View>
      </View>

      {isCheckingZone && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}
        >
          <ActivityIndicator size='large' color={currentTheme.spinnerColor} />
        </View>
      )}

      <ForceUpdate />

      <ModalDropdown theme={currentTheme} visible={citiesModalVisible} onItemPress={handleMarkerPress} onClose={() => setCitiesModalVisible(false)} />
    </View>
  )
}

const allowedLocationStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
    lineHeight: 24
  },
  button: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
})
