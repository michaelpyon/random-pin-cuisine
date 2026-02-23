import { useState, useCallback, useRef } from 'react'
import WorldMap from './components/WorldMap'
import ResultsPanel from './components/ResultsPanel'
import { reverseGeocode, isOcean, isAntarctica, getRandomLandCoords } from './utils/geocode'
import { classifyCuisine } from './utils/claude'
import { findNYCRestaurants } from './utils/yelp'
import './App.css'

const NYC_CENTER = { lat: 40.7580, lng: -73.9855 }
const DEFAULT_RADIUS = 5000

const EDGE_CASE_MESSAGES = {
  ocean: "You dropped a pin in the ocean! Fish don't have restaurants... yet. Try again on land!",
  antarctica: "Brr! Antarctica's cuisine is mostly freeze-dried rations and penguin-adjacent sadness. Try somewhere warmer!",
  arctic: "You found the North Pole! Santa's kitchen is invite-only. Try somewhere more accessible!",
  unknown: "This place is so remote, even Google Maps gave up. Try somewhere more... inhabited!",
}

export default function App() {
  const [pin, setPin] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchCenter, setSearchCenter] = useState(NYC_CENTER)
  const [searchRadius, setSearchRadius] = useState(DEFAULT_RADIUS)

  // Keep a ref to the latest cuisine so re-searches can use it
  const lastCuisineRef = useRef(null)

  const searchRestaurants = useCallback(async (cuisineInfo, center, radius) => {
    return findNYCRestaurants(cuisineInfo, {
      center,
      radiusMeters: radius,
    })
  }, [])

  const processPin = useCallback(async (lat, lng) => {
    setPin({ lat, lng })
    setResult(null)
    setError(null)
    setLoading(true)

    try {
      if (isAntarctica(lat)) {
        setError(EDGE_CASE_MESSAGES.antarctica)
        setLoading(false)
        return
      }

      if (lat > 75) {
        setError(EDGE_CASE_MESSAGES.arctic)
        setLoading(false)
        return
      }

      const locationInfo = await reverseGeocode(lat, lng)

      if (isOcean(lat, lng, locationInfo)) {
        setError(EDGE_CASE_MESSAGES.ocean)
        setLoading(false)
        return
      }

      if (!locationInfo.country) {
        setError(EDGE_CASE_MESSAGES.unknown)
        setLoading(false)
        return
      }

      const cuisineInfo = await classifyCuisine(locationInfo)
      lastCuisineRef.current = cuisineInfo

      const restaurants = await searchRestaurants(cuisineInfo, searchCenter, searchRadius)

      setResult({
        location: { ...locationInfo, lat, lng },
        cuisine: cuisineInfo,
        restaurants,
      })
    } catch (err) {
      console.error('Pipeline error:', err)
      setError(`Something went wrong: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [searchCenter, searchRadius, searchRestaurants])

  const handleMapClick = useCallback((lat, lng) => {
    const roundedLat = Math.round(lat * 1000) / 1000
    const roundedLng = Math.round(lng * 1000) / 1000
    processPin(roundedLat, roundedLng)
  }, [processPin])

  const handleRandomPin = useCallback(() => {
    const { lat, lng } = getRandomLandCoords()
    processPin(lat, lng)
  }, [processPin])

  const handleClose = useCallback(() => {
    setResult(null)
    setError(null)
    setLoading(false)
  }, [])

  // Re-search with new center/radius
  const handleCenterChange = useCallback(async (newCenter) => {
    setSearchCenter(newCenter)
    if (lastCuisineRef.current && result) {
      setLoading(true)
      try {
        const restaurants = await searchRestaurants(lastCuisineRef.current, newCenter, searchRadius)
        setResult((prev) => prev ? { ...prev, restaurants } : null)
      } catch (err) {
        console.error('Re-search error:', err)
      } finally {
        setLoading(false)
      }
    }
  }, [searchRadius, result, searchRestaurants])

  const handleRadiusChange = useCallback(async (newRadius) => {
    setSearchRadius(newRadius)
    if (lastCuisineRef.current && result) {
      setLoading(true)
      try {
        const restaurants = await searchRestaurants(lastCuisineRef.current, searchCenter, newRadius)
        setResult((prev) => prev ? { ...prev, restaurants } : null)
      } catch (err) {
        console.error('Re-search error:', err)
      } finally {
        setLoading(false)
      }
    }
  }, [searchCenter, result, searchRestaurants])

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">📍 Random Pin Cuisine Finder</h1>
        <p className="app-subtitle">
          Drop a pin anywhere on Earth — discover the local cuisine &amp; find it in NYC
        </p>
      </header>

      <div className="map-container">
        <WorldMap pin={pin} onMapClick={handleMapClick} />

        {!pin && !loading && (
          <div className="map-hint">
            <span className="map-hint-pulse" />
            <span className="map-hint-text">Click anywhere to explore</span>
          </div>
        )}

        <button className="random-pin-btn" onClick={handleRandomPin} disabled={loading}>
          {loading ? '...' : '🎲 Random Pin'}
        </button>
      </div>

      <ResultsPanel
        result={result}
        loading={loading}
        error={error}
        onClose={handleClose}
        searchCenter={searchCenter}
        searchRadius={searchRadius}
        onCenterChange={handleCenterChange}
        onRadiusChange={handleRadiusChange}
      />
    </div>
  )
}
