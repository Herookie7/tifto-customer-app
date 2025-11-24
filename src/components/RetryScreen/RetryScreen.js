import React, { useContext } from 'react'
import { ScrollView, RefreshControl } from 'react-native'
import TextDefault from '../Text/TextDefault/TextDefault'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { useTranslation } from 'react-i18next'
import ErrorSvg from '../../assets/SVG/error'

const RetryScreen = ({ onRetry, refreshing = false }) => {
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const { t } = useTranslation()

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
      refreshControl={
        onRetry ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRetry} />
        ) : undefined
      }
    >
      <ErrorSvg fill={currentTheme.newIconColor} />
      <TextDefault center H3 bolder textColor={currentTheme.newFontcolor}>
        {t('somethingWentWrong')}
      </TextDefault>
      <TextDefault center H4 textColor={currentTheme.newFontcolor}>
        {t('checkInternet')}
      </TextDefault>
    </ScrollView>
  )
}

export default RetryScreen

