import React, { useContext } from 'react'
import {
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TouchableWithoutFeedback
} from 'react-native'
import { Feather, Entypo } from '@expo/vector-icons'
import TextDefault from '../Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'
import { LocationContext } from '../../context/Location'
import { useTranslation } from 'react-i18next'
import Spinner from '../Spinner/Spinner'

const ModalDropdown = ({ theme, visible, onItemPress, onClose }) => {
  const { t } = useTranslation()
  const { cities, loading, error, isConnected, refetch } = useContext(LocationContext)
  
  const handleRetry = async () => {
    try {
      if (refetch) {
        await refetch()
      }
    } catch (err) {
      console.error('Error retrying cities fetch:', err)
    }
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item(theme)}
      onPress={() => {
        onItemPress({
          name: item.name,
          latitude: item.latitude,
          longitude: item.longitude
        })
      }}>
      <TextDefault H5 bold textColor={theme.color7}>
        {item.name}
      </TextDefault>
      <Entypo name={theme.isRTL ? "chevron-left" : "chevron-right"} size={24} color={theme.newIconColor} />
    </TouchableOpacity>
  )

  const renderEmptyState = () => {
    if (error) {
      return (
        <View style={styles.emptyStateContainer}>
          <TextDefault textColor={theme.gray900} H5 center style={{ marginBottom: scale(10) }}>
            {t('errorLoadingCities') || 'Unable to load cities'}
          </TextDefault>
          <TextDefault textColor={theme.gray900} center style={{ marginBottom: scale(20) }}>
            {t('errorLoadingCitiesDescription') || 'There was an error loading available cities. Please try again.'}
          </TextDefault>
          <TouchableOpacity style={styles.retryButton(theme)} onPress={handleRetry}>
            <TextDefault textColor={theme.color4} bold>
              {t('retry') || 'Retry'}
            </TextDefault>
          </TouchableOpacity>
        </View>
      )
    }
    
    return (
      <View style={styles.emptyStateContainer}>
        <TextDefault textColor={theme.gray900} H5 center style={{ marginBottom: scale(10) }}>
          {t('noCitiesAvailable') || 'No cities available'}
        </TextDefault>
        <TextDefault textColor={theme.gray900} center>
          {t('noCitiesAvailableDescription') || 'We are currently not serving in any cities. Please check back later.'}
        </TextDefault>
      </View>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      backdropOpacity={1}
      transparent={true}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={styles.modalContainer(theme)}>
        <View style={styles.header(theme)}>
          <TextDefault textColor={theme.gray900} H3 bolder>
            {t('exploreCities')}
          </TextDefault>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Feather name="x-circle" size={30} color={theme.newIconColor} />
          </TouchableOpacity>
        </View>
        {!isConnected ? (
          <View style={styles.emptyStateContainer}>
            <TextDefault textColor={theme.gray900} H5 center style={{ marginBottom: scale(10) }}>
              {t('offline') || 'You\'re offline'}
            </TextDefault>
            <TextDefault textColor={theme.gray900} center>
              {t('offlineDescription') || 'Please check your internet connection and try again.'}
            </TextDefault>
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <Spinner backColor={theme.cardBackground} spinnerColor={theme.iconColor} />
            <TextDefault textColor={theme.gray900} center style={{ marginTop: scale(20) }}>
              {t('loadingCities') || 'Loading cities...'}
            </TextDefault>
          </View>
        ) : cities && cities.length > 0 ? (
          <FlatList
            data={cities}
            renderItem={renderItem}
            keyExtractor={item => item.id?.toString() || item._id?.toString() || Math.random().toString()}
            ListEmptyComponent={renderEmptyState()}
          />
        ) : (
          renderEmptyState()
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    height: '60%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)'
  },
  modalContainer: theme => ({
    flex: 1,
    justifyContent: 'flex-end',
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    backgroundColor: theme.cardBackground,
    borderColor: theme.customBorder,
    borderWidth: scale(1),
    marginTop: scale(-22)
  }),
  header: theme => ({
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: theme.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    marginTop: scale(20),
    marginLeft: scale(12),
    marginRight: scale(8),
    marginBottom: scale(16)
  }),
  closeButton: {
    alignSelf: 'flex-end',
    margin: scale(10)
  },
  item: theme =>({
    flexDirection: theme.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: theme.cardBackground,
    borderBottomWidth: scale(0.5),
    borderBottomColor: '#ccc'
  }),
  emptyStateContainer: {
    paddingTop: scale(100),
    paddingBottom: scale(130),
    paddingHorizontal: scale(50),
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingContainer: {
    paddingTop: scale(100),
    paddingBottom: scale(130),
    justifyContent: 'center',
    alignItems: 'center'
  },
  retryButton: theme => ({
    backgroundColor: theme.color4 + '20',
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(8),
    marginTop: scale(10)
  })
})

export default ModalDropdown
