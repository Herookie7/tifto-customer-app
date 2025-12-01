import React, { useContext } from 'react'
import { View, ImageBackground, TouchableOpacity, Dimensions, Image } from 'react-native'
import styles from './styles'
import TextDefault from '../../Text/TextDefault/TextDefault'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import { SwiperFlatList } from 'react-native-swiper-flatlist'
import { useNavigation } from '@react-navigation/native'
import VideoBanner from './VideoBanner'
import { BANNER_PARAMETERS } from '../../../utils/banner-routes'
import { scale } from '../../../utils/scaling'

// Helper function to get media type from URL
const getMediaTypeFromUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return 'image' // Default to image if URL is invalid
  }
  const extension = url.split('.').pop()?.toLowerCase()
  if (!extension) {
    return 'image' // Default to image if no extension found
  }
  const videoExtensions = ['mp4']
  return videoExtensions.includes(extension) ? 'video' : 'image'
}

const Banner = ({ banners }) => {
  const navigation = useNavigation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const { width } = Dimensions.get('window')

  const onPressBanner = (banner) => {
    let parameters = null
    const action = banner.action
    
    // Parse parameters if they exist
    if (banner?.parameters) {
      try {
        parameters = JSON.parse(banner.parameters)
      } catch (e) {
        console.warn('Failed to parse banner parameters:', e)
        parameters = null
      }
    }

    if (action === 'Navigate Specific Restaurant') {
      navigation.navigate('Restaurant', {
        _id: banner.screen
      })
    } else {
      // Check if screen exists in BANNER_PARAMETERS
      const bannerConfig = BANNER_PARAMETERS[banner?.screen]
      
      if (!bannerConfig) {
        console.warn(`Banner screen "${banner?.screen}" not found in BANNER_PARAMETERS`)
        return
      }

      const { name, selectedType, queryType } = bannerConfig
      
      // Prepare navigation params
      const navParams = {
        selectedType: selectedType ?? 'restaurant',
        queryType: queryType ?? 'restaurant'
      }
      
      // If parameters exist and are an object, merge them into nav params
      if (parameters && typeof parameters === 'object' && !Array.isArray(parameters)) {
        Object.assign(navParams, parameters)
      }
      
      navigation.navigate(name, navParams)
    }
  }

  const renderBannerContent = (item) => (
    <View style={styles().container}>
      <TextDefault H3 bolder textColor='#fff' style={{ textTransform: 'capitalize', marginHorizontal: scale(5) }}>
        {item?.title}
      </TextDefault>
      <TextDefault bolder textColor='#fff' style={{ marginHorizontal: scale(5), marginBottom: scale(5) }}>
        {item?.description}
      </TextDefault>
    </View>
  )

  return (
    <SwiperFlatList
      autoplay
      autoplayDelay={3}
      autoplayLoop
      removeClippedSubviews={true}
      windowSize={3}
      showPagination
      data={banners ?? []}
      snapToInterval={width} // Ensures only one image is visible at a time
      snapToAlignment='center'
      paginationStyle={styles().pagination}
      paginationActiveColor={currentTheme.main}
      paginationDefaultColor={currentTheme.hex}
      paginationStyleItemActive={styles().paginationItem}
      paginationStyleItemInactive={styles().paginationItem}
      renderItem={({ item }) => {
        const mediaType = getMediaTypeFromUrl(item.file)

        return (
          <TouchableOpacity
            style={[styles(currentTheme).banner, { width }]}
            activeOpacity={0.9}
            onPress={() => {
              onPressBanner(item)
            }}
          >
            {mediaType === 'video' ? (
              <VideoBanner style={styles().image} source={{ uri: item?.file }}>
                {renderBannerContent(item)}
              </VideoBanner>
            ) : (
              <View style={styles().csd}>
                <ImageBackground source={{ uri: item?.file }} style={styles().imgs1} resizeMode='cover'>
                  {renderBannerContent(item)}
                </ImageBackground>
              </View>
            )}
          </TouchableOpacity>
        )
      }}
    />
  )
}

export default Banner
