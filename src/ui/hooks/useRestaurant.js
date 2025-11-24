import { useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import { restaurant } from '../../apollo/queries'
import { useEffect } from 'react'

const RESTAURANT = gql`
  ${restaurant}
`

export default function useRestaurant(id) {
  const { data, refetch, networkStatus, loading, error } = useQuery(
    RESTAURANT,
    { 
      variables: { id }, 
      fetchPolicy: 'network-only',
      skip: !id, // Skip query if id is missing
      onError: (err) => {
        console.error('useRestaurant query error:', err);
        console.error('Restaurant ID used:', id);
      }
    }
  )
  
  useEffect(() => {
    if (id) {
      console.log('useRestaurant: Fetching restaurant with ID:', id);
    } else {
      console.warn('useRestaurant: No restaurant ID provided, query skipped');
    }
  }, [id])
  
  return { data, refetch, networkStatus, loading, error }
}
