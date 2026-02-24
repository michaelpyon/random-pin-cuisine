import { useState, useCallback, useRef, useEffect } from 'react'
import WorldMap from './components/WorldMap'
import ResultsPanel from './components/ResultsPanel'
import PinHistory from './components/PinHistory'
import { reverseGeocode, isOcean, isAntarctica, getRandomLandCoords } from './utils/geocode'
import { classifyCuisine } from './utils/claude'
import { findNYCRestaurants, enrichRestaurants } from './utils/yelp'
import { getPinHistory, addPinToHistory, clearPinHistory } from './utils/pinHistory'
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
  const [shareToast, setShareToast] = useState(false)
  const [pinHistory, setPinHistory] = useState(() => getPinHistory())
  // true while user is panning to reposition before re-dropping the pin
  const [repositioning, setRepositioning] = useState(false)

  // Keep a ref to the latest cuisine so re-searches can use it
  const lastCuisineRef = useRef(null)
  const toastTimerRef = useRef(null)
  // Guard against concurrent processPin calls (e.g. from accidental re-fires)
  const isSearchingRef = useRef(false)

  const searchRestaurants = useCallback(async (cuisineInfo, center, radius) => {
    return findNYCRestaurants(cuisineInfo, {
      center,
      radiusMeters: radius,
    })
  }, [])

  const processPin = useCallback(async (lat, lng) => {
    // Prevent concurrent calls — map events (zoom/pan) must never reach here,
    // but this ref is a final safety net against any accidental re-entry.
    if (isSearchingRef.current) return
    isSearchingRef.current = true

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

      // Save to pin history
      const neighborhood =
        locationInfo.city ||
        locationInfo.county ||
        locationInfo.state ||
        locationInfo.country ||
        'Unknown'
      const updated = addPinToHistory({
        lat,
        lng,
        cuisineType: cuisineInfo.cuisineType,
        neighborhood,
      })
      setPinHistory(updated)

      // Show results IMMEDIATELY (no ratings yet — enriching happens in background)
      const immediateResult = {
        location: { ...locationInfo, lat, lng },
        cuisine: cuisineInfo,
        restaurants,
        enriching: restaurants.length > 0,
      }
      setResult(immediateResult)

      // Kick off background enrichment WITHOUT awaiting (non-blocking)
      if (restaurants.length > 0) {
        enrichRestaurants(restaurants).then((enriched) => {
          setResult((prev) =>
            prev ? { ...prev, restaurants: enriched, enriching: false } : null
          )
        }).catch(() => {
          setResult((prev) => prev ? { ...prev, enriching: false } : null)
        })
      }
    } catch (err) {
      console.error('Pipeline error:', err)
      setError(`Something went wrong: ${err.message}`)
    } finally {
      setLoading(false)
      isSearchingRef.current = false
    }
  }, [searchCenter, searchRadius, searchRestaurants])

  const handleMapClick = useCallback((lat, lng) => {
    setRepositioning(false)
    const roundedLat = Math.round(lat * 1000) / 1000
    const roundedLng = Math.round(lng * 1000) / 1000
    processPin(roundedLat, roundedLng)
  }, [processPin])

  // "Drop Pin Here" button — reads map center coords from WorldMap
  const handleDropPin = useCallback((lat, lng) => {
    setRepositioning(false)
    const roundedLat = Math.round(lat * 10000) / 10000
    const roundedLng = Math.round(lng * 10000) / 10000
    processPin(roundedLat, roundedLng)
  }, [processPin])

  // Draggable marker moved — re-run pipeline with new coords
  const handlePinDrag = useCallback((lat, lng) => {
    processPin(lat, lng)
  }, [processPin])

  // "Reposition" — open crosshair mode without discarding the pin
  const handleReposition = useCallback(() => {
    setRepositioning(true)
    setResult(null)
    setError(null)
  }, [])

  const handleRandomPin = useCallback(() => {
    setRepositioning(false)
    const { lat, lng } = getRandomLandCoords()
    processPin(lat, lng)
  }, [processPin])

  const handleClose = useCallback(() => {
    setResult(null)
    setError(null)
    setLoading(false)
    setRepositioning(false)
    // Clear ?lat&lng params from URL when closing
    const url = new URL(window.location.href)
    url.searchParams.delete('lat')
    url.searchParams.delete('lng')
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Share pin: encode lat/lng into URL + copy to clipboard
  const handleSharePin = useCallback(() => {
    if (!result) return
    const { lat, lng } = result.location
    const url = new URL(window.location.href)
    url.searchParams.set('lat', lat.toFixed(4))
    url.searchParams.set('lng', lng.toFixed(4))
    const shareUrl = url.toString()
    // Update browser URL bar
    window.history.replaceState({}, '', shareUrl)
    // Copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {})
    }
    // Show toast
    setShareToast(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setShareToast(false), 2500)
  }, [result])

  // Called ONLY when the user explicitly clicks "Search This Area" in the mini-map.
  // Updates committed center/radius then re-searches — no auto-trigger on zoom/drag.
  const handleSearchArea = useCallback(async (newCenter, newRadius) => {
    setSearchCenter(newCenter)
    setSearchRadius(newRadius)
    if (lastCuisineRef.current) {
      setLoading(true)
      try {
        const restaurants = await searchRestaurants(lastCuisineRef.current, newCenter, newRadius)
        setResult((prev) => prev ? { ...prev, restaurants, enriching: restaurants.length > 0 } : null)
        setLoading(false)
        if (restaurants.length > 0) {
          enrichRestaurants(restaurants).then((enriched) => {
            setResult((prev) => prev ? { ...prev, restaurants: enriched, enriching: false } : null)
          }).catch(() => {
            setResult((prev) => prev ? { ...prev, enriching: false } : null)
          })
        }
      } catch (err) {
        console.error('Re-search error:', err)
        setLoading(false)
      }
    }
  }, [searchRestaurants])

  const handleHistoryClear = useCallback(() => {
    const cleared = clearPinHistory()
    setPinHistory(cleared)
  }, [])

  const handleHistorySelect = useCallback((lat, lng) => {
    processPin(lat, lng)
  }, [processPin])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't fire while typing in an input/textarea
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) {
        if (!loading) handleRandomPin()
      } else if (e.key === 'Escape') {
        if (result || error || loading) handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading, result, error, handleRandomPin, handleClose])

  // On mount: check URL for ?lat=&lng= to auto-load a shared pin
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const lat = parseFloat(params.get('lat'))
    const lng = parseFloat(params.get('lng'))
    if (!isNaN(lat) && !isNaN(lng)) {
      processPin(lat, lng)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">📍 Random Pin Cuisine Finder</h1>
        <p className="app-subtitle">
          Drop a pin anywhere on Earth — discover the local cuisine &amp; find it in NYC
        </p>
      </header>

      <div className="map-container">
        <WorldMap
          pin={pin}
          onMapClick={handleMapClick}
          showCrosshair={!pin || repositioning}
          onDropPin={handleDropPin}
          onPinDrag={handlePinDrag}
        />

        {!pin && !loading && !repositioning && (
          <div className="map-hint map-hint--desktop">
            <span className="map-hint-pulse" />
            <span className="map-hint-text">Pan map &amp; tap Drop Pin — or click anywhere</span>
          </div>
        )}

        {/* Pin History strip — floats above the Random Pin button */}
        <PinHistory
          pins={pinHistory}
          onSelect={handleHistorySelect}
          onClear={handleHistoryClear}
        />

        {/* Random Pin button with [R] keyboard hint */}
        <div className="random-pin-wrapper">
          <button
            className="random-pin-btn"
            onClick={handleRandomPin}
            disabled={loading}
            title="Random Pin (press R)"
          >
            {loading ? '...' : '🎲 Random Pin'}
          </button>
          {!loading && <span className="random-pin-kbd">[R]</span>}
        </div>
      </div>

      <ResultsPanel
        result={result}
        loading={loading}
        error={error}
        onClose={handleClose}
        onSharePin={handleSharePin}
        shareToast={shareToast}
        searchCenter={searchCenter}
        searchRadius={searchRadius}
        onSearchArea={handleSearchArea}
        onReposition={handleReposition}
      />
    </div>
  )
}
