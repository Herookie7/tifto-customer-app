import React, { useContext } from 'react'
import { View, ActivityIndicator } from 'react-native'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'

const LoadingScreen = () => {
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: currentTheme.newheaderColor }}>
      <ActivityIndicator size="large" color={currentTheme.spinnerColor || currentTheme.white} />
    </View>
  )
}

export default LoadingScreen

