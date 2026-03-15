// Query the app's backend proxy instead of calling rate-limited providers
// directly from the browser. This keeps keys server-side and makes results
// cacheable across users.
const FIND_RESTAURANTS_URL = '/api/find-restaurants'

// Default NYC center (Midtown Manhattan)
const NYC_CENTER = { lat: 40.7580, lng: -73.9855 }

// Default search radius in meters
const DEFAULT_RADIUS = 5000

export async function findNYCRestaurants(cuisineInfo, { center, radiusMeters } = {}) {
  const { osmCuisineTag, cuisineType } = cuisineInfo
  const searchCenter = center || NYC_CENTER
  const radius = radiusMeters || DEFAULT_RADIUS

  const params = new URLSearchParams({
    lat: searchCenter.lat.toString(),
    lng: searchCenter.lng.toString(),
    radius: radius.toString(),
    cuisineTag: osmCuisineTag,
    cuisineType,
  })

  if (cuisineInfo.osmFallbackTag) {
    params.set('fallbackTag', cuisineInfo.osmFallbackTag)
  }

  const res = await fetch(`${FIND_RESTAURANTS_URL}?${params}`)
  if (!res.ok) {
    throw new Error('Restaurant search failed')
  }

  const data = await res.json()
  if (data.noMatch) {
    return { results: [], noMatch: true, cuisineType }
  }

  return data.results || []
}

/**
 * Fallback search with NO cuisine filter — returns up to 10 nearby restaurants
 * regardless of cuisine. Used as a last resort when no cuisine-matched results
 * are found (e.g. "Search anyway" button).
 */
export async function findNYCRestaurantsUnfiltered({ center, radiusMeters } = {}) {
  const searchCenter = center || NYC_CENTER
  const radius = radiusMeters || DEFAULT_RADIUS

  const params = new URLSearchParams({
    lat: searchCenter.lat.toString(),
    lng: searchCenter.lng.toString(),
    radius: radius.toString(),
    unfiltered: '1',
  })

  const res = await fetch(`${FIND_RESTAURANTS_URL}?${params}`)
  if (!res.ok) {
    return []
  }
  const data = await res.json()
  return data.results || []
}

/**
 * Enriches a list of formatted restaurants with Google Places ratings.
 * Exported separately so App.jsx can call it after displaying results.
 */
export async function enrichRestaurants(restaurants) {
  // Results now come back from the backend already enriched and cached.
  return restaurants
}
