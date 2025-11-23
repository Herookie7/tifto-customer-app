import React, { useEffect, useState, useContext } from 'react'
import {
  View,
  Text,
  Modal,
  Button,
  Linking,
  Platform,
  StyleSheet
} from 'react-native'
import * as Application from 'expo-application'
import { gql, useQuery } from '@apollo/client'
import { getVersions } from '../../apollo/queries'
import { useTranslation } from 'react-i18next'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import styles from './styles'
import TextDefault from '../Text/TextDefault/TextDefault'

const VERSIONS = gql`
  ${getVersions}
`

const compareVersions = (version1, version2) => {
  // Handle null or undefined versions
  if (!version1 || !version2) {
    console.warn('compareVersions: One or both versions are null/undefined', { version1, version2 });
    return 0; // Return 0 (equal) if either version is missing
  }

  // Ensure versions are strings
  const v1Str = String(version1);
  const v2Str = String(version2);

  const v1Parts = v1Str.split('.').map(Number)
  const v2Parts = v2Str.split('.').map(Number)

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1 = v1Parts[i] || 0
    const v2 = v2Parts[i] || 0

    if (v1 > v2) return 1
    if (v1 < v2) return -1
  }

  return 0
}

const ForceUpdate = () => {
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false)
  const [currentVersion, setCurrentVersion] = useState(null)
  const { loading, error, data } = useQuery(VERSIONS)
  const { t } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]

  useEffect(() => {
    const fetchCurrentVersion = async() => {
      const appVersion = await Application.nativeApplicationVersion
      setCurrentVersion(appVersion)
    }

    fetchCurrentVersion()
  }, [])

  useEffect(() => {
    const checkUpdate = () => {
      if (data?.getVersions && currentVersion) {
        const { customerAppVersion } = data.getVersions

        // Check if customerAppVersion exists
        if (!customerAppVersion) {
          console.warn('ForceUpdate: customerAppVersion is missing');
          return;
        }

        // New Version
        const new_version =
          Platform.OS === 'ios'
            ? customerAppVersion.ios
            : customerAppVersion.android

        // Only compare if new_version exists and is not null
        if (new_version && currentVersion && compareVersions(currentVersion, new_version) < 0) {
          setIsUpdateModalVisible(true)
        }
      }
    }

    checkUpdate()
  }, [data, currentVersion])

  const handleUpdate = async() => {
    try {
      const storeUrl =
        Platform.OS === 'ios'
          ? 'https://apps.apple.com/pk/app/tifto/id1526488093'
          : 'https://play.google.com/store/apps/details?id=com.tifto.tifto&pli=1'

      await Linking.openURL(storeUrl)
    } catch (err) {
      console.error('Error opening store URL:', err)
    }
  }

  if (loading) {
    return (<Text>Loading...</Text>);
  }

  return (
    <Modal
      visible={isUpdateModalVisible}
      transparent={true}
      animationType='fade'
      onRequestClose={() => {}}
    >
      <View style={styles().modalContainer}>
        <View style={styles(currentTheme).modalContent}>
          <TextDefault
            bold
            textColor={currentTheme.fontMainColor}
            style={styles(currentTheme).title}
          >
            {t('UpdateAvailable')}
          </TextDefault>
          <TextDefault style={styles(currentTheme).message}>
            {t('UpdateAvailableText')}
          </TextDefault>
          <Button title={t('UpdateNow')} onPress={handleUpdate} />
        </View>
      </View>
    </Modal>
  )
}

export default ForceUpdate
