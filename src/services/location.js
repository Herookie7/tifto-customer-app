import * as Location from 'expo-location'

export async function getSafeLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      return null
    }

    const pos = await Location.getCurrentPositionAsync({})
    if (!pos || !pos.coords) return null
    return pos
  } catch (e) {
    return null
  }
}

