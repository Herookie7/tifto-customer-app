import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { en } from './translations/en'

const FALLBACK_LANGUAGE = 'en'

export const languageResources = {
  en: { translation: en }
}

const languageLoaders = {
  ar: () => import('./translations/ar'),
  az: () => import('./translations/az'),
  bn: () => import('./translations/bn'),
  de: () => import('./translations/de'),
  es: () => import('./translations/es'),
  fa: () => import('./translations/fa'),
  fr: () => import('./translations/fr'),
  gu: () => import('./translations/gu'),
  he: () => import('./translations/he'),
  hi: () => import('./translations/hi'),
  id: () => import('./translations/id'),
  it: () => import('./translations/it'),
  jp: () => import('./translations/jp'),
  km: () => import('./translations/km'),
  ko: () => import('./translations/ko'),
  ku: () => import('./translations/ku'),
  mr: () => import('./translations/mr'),
  nl: () => import('./translations/nl'),
  pl: () => import('./translations/pl'),
  ps: () => import('./translations/ps'),
  pt: () => import('./translations/pt'),
  ro: () => import('./translations/ro'),
  ru: () => import('./translations/ru'),
  te: () => import('./translations/te'),
  th: () => import('./translations/th'),
  tr: () => import('./translations/tr'),
  ur: () => import('./translations/ur'),
  uz: () => import('./translations/uz'),
  vi: () => import('./translations/vi'),
  zh: () => import('./translations/zh')
}

const supportedLanguages = [FALLBACK_LANGUAGE, ...Object.keys(languageLoaders)]

i18next
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    lng: FALLBACK_LANGUAGE,
    fallbackLng: FALLBACK_LANGUAGE,
    resources: languageResources,
    interpolation: {
      escapeValue: false // React already escapes by default
    }
  })

const extractTranslations = (languageCode, module) => {
  if (!module) return null
  if (module.translation) return module.translation
  if (module[languageCode]) return module[languageCode]
  if (module.default) return module.default

  return module
}

const loadLanguageResources = async(languageCode) => {
  if (!languageCode || i18next.hasResourceBundle(languageCode, 'translation')) return

  const loader = languageLoaders[languageCode]
  if (!loader) return

  const module = await loader()
  const translation = extractTranslations(languageCode, module)
  if (translation) {
    i18next.addResourceBundle(languageCode, 'translation', translation, true, true)
  }
}

const originalChangeLanguage = i18next.changeLanguage.bind(i18next)
i18next.changeLanguage = async(languageCode, ...rest) => {
  if (languageCode && languageCode !== FALLBACK_LANGUAGE) {
    await loadLanguageResources(languageCode)
  }

  return originalChangeLanguage(languageCode, ...rest)
}

const detectAndSetLanguage = async() => {
  try {
    const storedLanguage = await AsyncStorage.getItem('tifto-language')
    const systemLanguage = Localization?.locale?.split('-')[0]

    // Prefer stored language if available, else system language if supported, else fallback to fallback language
    let languageToUse = FALLBACK_LANGUAGE
    if (storedLanguage && supportedLanguages.includes(storedLanguage)) {
      languageToUse = storedLanguage
    } else if (systemLanguage && supportedLanguages.includes(systemLanguage)) {
      languageToUse = systemLanguage
    }

    await i18next.changeLanguage(languageToUse)

    // Optionally clear stored language keys if you want fresh detection next time
    await AsyncStorage.removeItem('tifto-language')
    await AsyncStorage.removeItem('tifto-language-name')
  } catch (error) {
    console.error('Error detecting or setting language:', error)
  }
}

detectAndSetLanguage()

export const preloadLanguage = loadLanguageResources
export const supportedLanguageCodes = supportedLanguages

export default i18next
