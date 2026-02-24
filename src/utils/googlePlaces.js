/**
 * Google Places enrichment utility.
 *
 * Uses the Google Maps JS API (Places library) loaded via index.html script tag.
 * REST endpoint is not usable from the browser due to CORS, so we rely on
 * window.google.maps.places.PlacesService instead.
 *
 * Enriches each restaurant with:
 *   - googleRating      : number (1–5, e.g. 4.2) | null
 *   - googleReviewCount : number (e.g. 312)       | null
 *   - googlePriceLevel  : number (1–4, $ signs)   | null
 *
 * Results are cached in sessionStorage keyed by name + lat/lon so the same
 * restaurant is never fetched twice in a session.
 */

const CACHE_PREFIX = 'gplaces:'

// Set to true if gm_authFailure fires — skip all enrichment
let _apiBlocked = false
window.gm_authFailure = () => { _apiBlocked = true }

function cacheKey(name, lat, lon) {
  return `${CACHE_PREFIX}${name}|${Number(lat).toFixed(4)}|${Number(lon).toFixed(4)}`
}

function fromCache(key) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function toCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

/**
 * Poll until window.google.maps.places.PlacesService is available,
 * or reject after maxMs. Handles async script loading gracefully.
 */
function waitForGoogle(maxMs = 5000) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places?.PlacesService) {
      resolve()
      return
    }
    const started = Date.now()
    const timer = setInterval(() => {
      if (window.google?.maps?.places?.PlacesService) {
        clearInterval(timer)
        resolve()
      } else if (Date.now() - started > maxMs) {
        clearInterval(timer)
        reject(new Error('Google Maps JS API did not load in time'))
      }
    }, 150)
  })
}

// Singleton PlacesService backed by a detached div (no visible map required)
let _service = null
function getService() {
  if (!_service) {
    const attrDiv = document.createElement('div')
    _service = new window.google.maps.places.PlacesService(attrDiv)
  }
  return _service
}

const NULL_PLACE = { googleRating: null, googleReviewCount: null, googlePriceLevel: null }

/**
 * Look up a single restaurant via PlacesService.findPlaceFromQuery.
 * Location bias is a 500m circle around the known OSM lat/lon.
 *
 * Returns { googleRating, googleReviewCount, googlePriceLevel } — all null on miss.
 * Times out after 6s to prevent hanging on unauthorized API keys.
 */
function fetchOnePlaceData(service, name, lat, lon) {
  return new Promise((resolve) => {
    // Safety timeout — if the callback never fires (e.g. RefererNotAllowed), resolve gracefully
    const timeout = setTimeout(() => resolve(NULL_PLACE), 6000)

    const request = {
      // Append "New York" to the query to prefer NYC matches
      query: `${name} New York`,
      fields: ['rating', 'user_ratings_total', 'price_level'],
      // CircleLiteral — bias results within 500 m of the OSM position
      locationBias: {
        center: { lat, lng: lon },
        radius: 500,
      },
    }

    service.findPlaceFromQuery(request, (results, status) => {
      clearTimeout(timeout)
      const OK = window.google.maps.places.PlacesServiceStatus.OK
      if (status === OK && results?.[0]) {
        const p = results[0]
        resolve({
          googleRating: p.rating ?? null,
          googleReviewCount: p.user_ratings_total ?? null,
          // price_level 0 = "Free" (rare) — treat as null for $ display
          googlePriceLevel: p.price_level > 0 ? p.price_level : null,
        })
      } else {
        resolve(NULL_PLACE)
      }
    })
  })
}

/**
 * Enrich an array of restaurants with Google Places rating/review/price data.
 *
 * - Processes restaurants IN PARALLEL (up to 5 at a time) for speed.
 * - Caches each result in sessionStorage; cached entries are free (no API call).
 * - If the Google Maps API fails to load, returns restaurants unchanged.
 */
export async function enrichWithGooglePlaces(restaurants) {
  if (!restaurants?.length) return restaurants
  if (_apiBlocked) return restaurants

  try {
    await waitForGoogle(5000)
  } catch (err) {
    console.warn('[googlePlaces] Skipping enrichment —', err.message)
    return restaurants
  }

  if (_apiBlocked) return restaurants

  const service = getService()

  // Enrich all restaurants in parallel (PlacesService handles its own queueing)
  const results = await Promise.allSettled(
    restaurants.map(async (r) => {
      if (r.lat == null || r.lon == null) return r
      const key = cacheKey(r.name, r.lat, r.lon)
      const cached = fromCache(key)
      if (cached) return { ...r, ...cached }
      const placeData = await fetchOnePlaceData(service, r.name, r.lat, r.lon)
      toCache(key, placeData)
      return { ...r, ...placeData }
    })
  )

  return results.map((res, i) =>
    res.status === 'fulfilled' ? res.value : restaurants[i]
  )
}
