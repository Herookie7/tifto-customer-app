import axios from 'axios'
import useEnvVars from '../../../environment'

const useGeocoding = () => {
  const { GOOGLE_MAPS_KEY } = useEnvVars()

  const getAddress = async (latitude, longitude) => {
    // Validate inputs
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
        isNaN(latitude) || isNaN(longitude) || 
        !isFinite(latitude) || !isFinite(longitude)) {
      throw new Error('Invalid coordinates provided. Please select a valid location.')
    }

    // Validate latitude and longitude ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('Coordinates are out of valid range.')
    }

    // Check if API key is available
    if (!GOOGLE_MAPS_KEY) {
      console.error('Google Maps API key is not configured')
      throw new Error('Location services are not properly configured. Please contact support.')
    }

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_KEY}&language=en`,
        {
          timeout: 10000 // 10 second timeout
        }
      )

      // Check for Google Maps API errors
      if (response.data && response.data.status) {
        const status = response.data.status
        
        if (status === 'ZERO_RESULTS') {
          throw new Error('No address found for the selected location. Please try a different location.')
        } else if (status === 'OVER_QUERY_LIMIT') {
          console.error('Google Maps API: Over query limit')
          throw new Error('Location service is temporarily unavailable. Please try again later.')
        } else if (status === 'REQUEST_DENIED') {
          console.error('Google Maps API: Request denied - likely API key issue')
          throw new Error('Location services are not properly configured. Please contact support.')
        } else if (status === 'INVALID_REQUEST') {
          console.error('Google Maps API: Invalid request')
          throw new Error('Invalid location request. Please try again.')
        } else if (status !== 'OK') {
          console.error(`Google Maps API error: ${status}`)
          throw new Error('Unable to get address for the selected location. Please try again.')
        }
      }

      // Check if the response is successful and contains results
      if (
        response.data &&
        response.data.results &&
        response.data.results.length > 0
      ) {
        // Extract the formatted address from the first result
        const formattedAddress = response.data.results[0].formatted_address
        // Extract the city from the address components
        const cityComponent = response.data.results[0].address_components.find(
          (component) =>
            component.types.includes('locality') ||
            component.types.includes('administrative_area_level_2')
        )
        const city = cityComponent ? cityComponent.long_name : null
        
        return { formattedAddress, city }
        
      } else {
        throw new Error('No address found for the given coordinates.')
      }
    } catch (error) {
      // Handle network errors
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.error('Geocoding request timeout')
        throw new Error('Request timed out. Please check your internet connection and try again.')
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        console.error('Network error during geocoding')
        throw new Error('Network error. Please check your internet connection and try again.')
      } else if (error.response) {
        // HTTP error response
        console.error('Geocoding HTTP error:', error.response.status, error.response.data)
        throw new Error('Unable to get address for the selected location. Please try again.')
      } else if (error.request) {
        // Request made but no response
        console.error('No response from geocoding service')
        throw new Error('Unable to connect to location services. Please check your internet connection.')
      } else {
        // Error is already a user-friendly message from above checks
        console.error('Error fetching address:', error.message)
        throw error
      }
    }
  }
  return {getAddress}
}

export default useGeocoding
