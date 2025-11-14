let cachedAuthToken = null

export const setCachedAuthToken = (token) => {
  cachedAuthToken = token ?? null
}

export const getCachedAuthToken = () => cachedAuthToken
