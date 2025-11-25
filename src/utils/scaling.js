import { Dimensions } from 'react-native'

// Guideline sizes are based on standard ~5" screen mobile device
const guidelineBaseWidth = 350
const guidelineBaseHeight = 680

const getDimensions = () => {
  try {
    return Dimensions.get('window')
  } catch (error) {
    // Fallback dimensions if Dimensions.get fails
    return { width: 350, height: 680 }
  }
}

const scale = size => {
  const { width } = getDimensions()
  return Math.round((width / guidelineBaseWidth) * size)
}

const verticalScale = size => {
  const { height } = getDimensions()
  return Math.round((height / guidelineBaseHeight) * size)
}

const moderateScale = (size, factor = 0.5) =>
  Math.round(size + (scale(size) - size) * factor)

export { scale, verticalScale, moderateScale }
