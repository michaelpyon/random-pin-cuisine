import { useState, useCallback, useRef, useEffect } from 'react'
import WorldMap from './components/WorldMap'
import ResultsPanel from './components/ResultsPanel'
import PinHistory from './components/PinHistory'
import { reverseGeocode, isOcean, isAntarctica, getRandomLandCoords } from './utils/geocode'
import { classifyCuisine } from './utils/claude'
import { findNYCRestaurants, findNYCRestaurantsUnfiltered, enrichRestaurants } from './utils/yelp'
import { getPinHistory, addPinToHistory, clearPinHistory } from './utils/pinHistory'
import {
  buildShareSnapshot,
  encodeShareSnapshot,
  decodeShareSnapshot,
  snapshotToResult,
  placeLabel,
  pickFeaturedRestaurant,
} from './utils/shareState'
import './App.css'

const NYC_CENTER = { lat: 40.7580, lng: -73.9855 }
const DEFAULT_RADIUS = 5000

// Geographic edge cases: these are intended, whimsical, "you dropped wrong" states.
// They are NOT technical failures and should NOT look like errors.
const EDGE_CASE_MESSAGES = {
  ocean: "You dropped a pin in the ocean! Fish don't have restaurants... yet. Try again on land!",
  antarctica: "Brr! Antarctica's cuisine is mostly freeze-dried rations and penguin-adjacent sadness. Try somewhere warmer!",
  arctic: "You found the North Pole! Santa's kitchen is invite-only. Try somewhere more accessible!",
  unknown: "This place is so remote, even Google Maps gave up. Try somewhere more... inhabited!",
}

// A hand-picked set of vivid, reliably-classifiable food regions that reliably
// have NYC representation. Used ONLY for the very first auto-pin so new visitors
// always see a satisfying reveal, never an ocean/edge-case on cold load.
const SEED_REGIONS = [
  { lat: 40.8400, lng: 14.2500, label: 'Naples, Italy' },
  { lat: 17.0600, lng: -96.7200, label: 'Oaxaca, Mexico' },
  { lat: 13.7500, lng: 100.5100, label: 'Bangkok, Thailand' },
  { lat: 21.0200, lng: 105.8500, label: 'Hanoi, Vietnam' },
  { lat: 41.0100, lng: 28.9700, label: 'Istanbul, Turkey' },
  { lat: 19.0700, lng: 72.8800, label: 'Mumbai, India' },
  { lat: 35.6800, lng: 139.6500, label: 'Tokyo, Japan' },
  { lat: 37.9800, lng: 23.7200, label: 'Athens, Greece' },
  { lat: 31.2200, lng: 29.9500, label: 'Alexandria, Egypt' },
  { lat: 1.3500,  lng: 103.8200, label: 'Singapore' },
  { lat: 23.1200, lng: -82.3800, label: 'Havana, Cuba' },
  { lat: -23.5500, lng: -46.6300, label: 'Sao Paulo, Brazil' },
]

function getSeededAutoPin() {
  const region = SEED_REGIONS[Math.floor(Math.random() * SEED_REGIONS.length)]
  // Tiny jitter so repeated visits don't land on the exact same pixel
  const jitter = () => (Math.random() - 0.5) * 0.15
  return {
    lat: Math.round((region.lat + jitter()) * 1000) / 1000,
    lng: Math.round((region.lng + jitter()) * 1000) / 1000,
  }
}

export default function App() {
  const [pin, setPin] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchCenter, setSearchCenter] = useState(NYC_CENTER)
  const [searchRadius, setSearchRadius] = useState(DEFAULT_RADIUS)
  // shareToast is false when hidden, or one of 'copied' | 'shared' | 'tweet'.
  const [shareToast, setShareToast] = useState(false)
  const [pinHistory, setPinHistory] = useState(() => getPinHistory())
  // true while user is panning to reposition before re-dropping the pin
  const [repositioning, setRepositioning] = useState(false)

  // Keep a ref to the latest cuisine so re-searches can use it
  const lastCuisineRef = useRef(null)
  const toastTimerRef = useRef(null)
  // Monotonically-increasing counter: each new processPin/handleSearchArea call
  // increments this. Async callbacks check they're still "current" before
  // applying results — prevents stale enrichment from overwriting newer searches.
  const searchVersionRef = useRef(0)

  const searchRestaurants = useCallback(async (cuisineInfo, center, radius) => {
    return findNYCRestaurants(cuisineInfo, {
      center,
      radiusMeters: radius,
    })
  }, [])

  const processPin = useCallback(async (lat, lng) => {
    // Each call gets a unique version ID. Any async step checks this before
    // applying results, so stale in-flight callbacks can't corrupt newer state.
    const myVersion = ++searchVersionRef.current

    lastCuisineRef.current = null
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

      // Bail if a newer search has taken over while we were awaiting
      if (searchVersionRef.current !== myVersion) return

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

      if (searchVersionRef.current !== myVersion) return

      lastCuisineRef.current = cuisineInfo

      const rawSearchResult = await searchRestaurants(cuisineInfo, searchCenter, searchRadius)

      if (searchVersionRef.current !== myVersion) return

      // Detect no-match sentinel returned by findNYCRestaurants
      const isNoMatch = rawSearchResult && !Array.isArray(rawSearchResult) && rawSearchResult.noMatch
      const restaurants = isNoMatch ? [] : rawSearchResult

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
        noMatch: isNoMatch,
        enriching: restaurants.length > 0,
      }
      setResult(immediateResult)

      // Kick off background enrichment WITHOUT awaiting (non-blocking).
      // Check version before applying to avoid overwriting a newer search.
      if (restaurants.length > 0) {
        enrichRestaurants(restaurants).then((enriched) => {
          if (searchVersionRef.current !== myVersion) return
          setResult((prev) =>
            prev ? { ...prev, restaurants: enriched, enriching: false } : null
          )
        }).catch(() => {
          if (searchVersionRef.current !== myVersion) return
          setResult((prev) => prev ? { ...prev, enriching: false } : null)
        })
      }
    } catch (err) {
      // Only surface the error if this is still the active search
      if (searchVersionRef.current === myVersion) {
        console.error('Pipeline error:', err)
        // Mark as a real technical failure so the UI renders it differently
        // from the whimsical geographic edge cases above.
        const technicalErr = new Error(err.message || 'Something went wrong on our end.')
        technicalErr.isTechnical = true
        setError(technicalErr)
      }
    } finally {
      if (searchVersionRef.current === myVersion) {
        setLoading(false)
      }
    }
  }, [searchCenter, searchRadius, searchRestaurants])

  // Render an exact reveal reconstructed from a shared-link snapshot, WITHOUT
  // re-running the geocode -> cuisine -> Overpass pipeline (which is
  // non-deterministic and would not return the same restaurant). The pin and
  // result are set directly so the receiver sees precisely what was shared.
  const showSharedResult = useCallback((reconstructed) => {
    // Bump the version so any auto-pin/in-flight pipeline can't overwrite this.
    ++searchVersionRef.current
    lastCuisineRef.current = reconstructed.cuisine
    setPin({ lat: reconstructed.location.lat, lng: reconstructed.location.lng })
    setError(null)
    setLoading(false)
    setResult(reconstructed)
  }, [])

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

  const handleRandomPin = useCallback(async () => {
    setRepositioning(false)
    // getRandomLandCoords() uses a curated city list so ocean hits should never
    // happen, but we retry up to 4 times silently just in case an offset nudges
    // a coastal city into water. Each retry picks a fresh random city.
    for (let attempt = 0; attempt < 4; attempt++) {
      const { lat, lng } = getRandomLandCoords()
      // Quick pre-check: if geocode returns null it's ocean — re-roll silently.
      // On the last attempt just let processPin handle it normally (shows error).
      if (attempt < 3) {
        try {
          const locationInfo = await reverseGeocode(lat, lng)
          if (isOcean(lat, lng, locationInfo)) continue // re-roll
          // Land confirmed — hand off to processPin with the validated coords
          processPin(lat, lng)
          return
        } catch {
          // Network error on pre-check — fall through to processPin
        }
      }
      processPin(lat, lng)
      return
    }
  }, [processPin])

  const handleClose = useCallback(() => {
    searchVersionRef.current += 1
    lastCuisineRef.current = null
    setResult(null)
    setError(null)
    setLoading(false)
    setRepositioning(false)
    // Clear share params from URL when closing
    const url = new URL(window.location.href)
    url.searchParams.delete('lat')
    url.searchParams.delete('lng')
    url.searchParams.delete('r')
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Pop a toast with a truthful message. `tone` controls icon/wording.
  const flashToast = useCallback((message) => {
    setShareToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setShareToast(false), 2500)
  }, [])

  // Share pin. Encodes the FULL reveal (pin, place label, cuisine, and the exact
  // restaurant the user saw) into the URL so the link reopens that same reveal
  // deterministically. On mobile we use the Web Share sheet and only confirm on
  // a real share; on desktop we copy the link and only say "copied" once the
  // clipboard write actually succeeds.
  const handleSharePin = useCallback(() => {
    if (!result) return
    const { lat, lng } = result.location

    // Build the shareable URL: legacy lat/lng (fallback + OG) plus the full
    // snapshot in `r` for deterministic reconstruction.
    const snapshot = buildShareSnapshot(result)
    const url = new URL(window.location.href)
    url.searchParams.set('lat', Number(lat).toFixed(4))
    url.searchParams.set('lng', Number(lng).toFixed(4))
    if (snapshot) {
      url.searchParams.set('r', encodeShareSnapshot(snapshot))
    }
    const shareUrl = url.toString()
    window.history.replaceState({}, '', shareUrl)

    // Share text names the actual restaurant the user saw, plus the pinned place.
    const place = placeLabel(result.location)
    const featured = pickFeaturedRestaurant(result.restaurants)
    const cuisineType = result.cuisine?.cuisineType || 'a cuisine'
    const shareText = featured?.name
      ? `I dropped a pin in ${place} and got ${featured.name}, NYC. Roll your own:`
      : `I dropped a pin in ${place} and got ${cuisineType} in NYC. Roll your own:`

    // 1. Mobile / Web Share sheet: only confirm on an actual successful share.
    if (navigator.share) {
      navigator.share({
        title: 'Random Pin Cuisine',
        text: shareText,
        url: shareUrl,
      }).then(() => {
        flashToast('shared')
      }).catch(() => {
        // User cancelled or the sheet failed: do NOT claim success. Stay silent.
      })
      return
    }

    // 2. Desktop: copy the link, and only toast "copied" once the write resolves.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => flashToast('copied'))
        .catch(() => {
          // Clipboard blocked: fall back to a Twitter intent so the share isn't
          // a dead end, and tell the truth (we opened a tab, did not copy).
          const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
          window.open(tweetUrl, '_blank', 'noopener,noreferrer')
          flashToast('tweet')
        })
      return
    }

    // 3. No clipboard at all: open a Twitter intent and say so honestly.
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    window.open(tweetUrl, '_blank', 'noopener,noreferrer')
    flashToast('tweet')
  }, [result, flashToast])

  // Called ONLY when the user explicitly clicks "Search This Area" in the mini-map.
  // Updates committed center/radius then re-searches — no auto-trigger on zoom/drag.
  const handleSearchArea = useCallback(async (newCenter, newRadius) => {
    setSearchCenter(newCenter)
    setSearchRadius(newRadius)
    if (lastCuisineRef.current) {
      // Increment the version so any in-flight processPin enrichment is ignored
      const myVersion = ++searchVersionRef.current
      setLoading(true)
      try {
        const rawSearchResult = await searchRestaurants(lastCuisineRef.current, newCenter, newRadius)
        if (searchVersionRef.current !== myVersion) return
        const isNoMatch = rawSearchResult && !Array.isArray(rawSearchResult) && rawSearchResult.noMatch
        const restaurants = isNoMatch ? [] : rawSearchResult
        setResult((prev) => prev ? { ...prev, restaurants, noMatch: isNoMatch, enriching: restaurants.length > 0 } : null)
        setLoading(false)
        if (restaurants.length > 0) {
          enrichRestaurants(restaurants).then((enriched) => {
            if (searchVersionRef.current !== myVersion) return
            setResult((prev) => prev ? { ...prev, restaurants: enriched, enriching: false } : null)
          }).catch(() => {
            if (searchVersionRef.current !== myVersion) return
            setResult((prev) => prev ? { ...prev, enriching: false } : null)
          })
        }
      } catch (err) {
        if (searchVersionRef.current === myVersion) {
          console.error('Re-search error:', err)
          setLoading(false)
        }
      }
    }
  }, [searchRestaurants])

  // "Search anyway" — ignores cuisine filter and returns any nearby restaurants
  const handleSearchAnyway = useCallback(async () => {
    const myVersion = ++searchVersionRef.current
    setLoading(true)
    try {
      const restaurants = await findNYCRestaurantsUnfiltered({ center: searchCenter, radiusMeters: searchRadius })
      if (searchVersionRef.current !== myVersion) return
      setResult((prev) => prev ? { ...prev, restaurants, noMatch: false, enriching: restaurants.length > 0 } : null)
      setLoading(false)
      if (restaurants.length > 0) {
        enrichRestaurants(restaurants).then((enriched) => {
          if (searchVersionRef.current !== myVersion) return
          setResult((prev) => prev ? { ...prev, restaurants: enriched, enriching: false } : null)
        }).catch(() => {
          if (searchVersionRef.current !== myVersion) return
          setResult((prev) => prev ? { ...prev, enriching: false } : null)
        })
      }
    } catch (err) {
      if (searchVersionRef.current === myVersion) {
        console.error('Search anyway error:', err)
        setLoading(false)
      }
    }
  }, [searchCenter, searchRadius])

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

  // Track whether user has ever dropped a pin (for first-visit UX)
  const [hasDroppedPin, setHasDroppedPin] = useState(() => {
    return localStorage.getItem('rpc-has-dropped') === '1'
  })

  // Mark first pin drop
  useEffect(() => {
    if (pin && !hasDroppedPin) {
      setHasDroppedPin(true)
      localStorage.setItem('rpc-has-dropped', '1')
    }
  }, [pin, hasDroppedPin])

  // On mount: check URL for ?lat=&lng= to auto-load a shared pin.
  // If no shared pin and this is a first-time visitor, auto-fire one seeded
  // pin from a curated list of vivid food regions so the app is immediately
  // alive rather than blank. Returning visitors (rpc-has-dropped = 1) also get
  // an auto-pin for instant gratification on each fresh load.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // 1. Full-reveal snapshot (`r`): reconstruct the EXACT shared result directly,
    // skipping the non-deterministic re-fetch so the receiver sees the same
    // restaurant that was screenshotted.
    const encoded = params.get('r')
    if (encoded) {
      const snapshot = decodeShareSnapshot(encoded)
      const reconstructed = snapshotToResult(snapshot)
      if (reconstructed) {
        showSharedResult(reconstructed)
        return
      }
      // Snapshot was partial/invalid: fall through to the lat/lng reprocess below.
    }

    // 2. Legacy / partial link: restore the pin by reprocessing lat/lng.
    const lat = parseFloat(params.get('lat'))
    const lng = parseFloat(params.get('lng'))
    if (!isNaN(lat) && !isNaN(lng)) {
      processPin(lat, lng)
      return
    }

    // 3. No shared params: auto-fire a seeded delight pin so the page is never blank.
    const { lat: seedLat, lng: seedLng } = getSeededAutoPin()
    processPin(seedLat, seedLng)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">📍 Random Pin</h1>
        <p className="app-subtitle">
          Roll a pin anywhere on the globe. Find that cuisine in NYC.
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
            <span className="map-hint-text">Hit 🎲 to roll, or click anywhere on the map</span>
          </div>
        )}

        {/* Pin History strip — floats above the Random Pin button */}
        <PinHistory
          pins={pinHistory}
          onSelect={handleHistorySelect}
          onClear={handleHistoryClear}
        />

        {/* Random Pin primary CTA with [R] keyboard hint */}
        <div className="random-pin-wrapper">
          <button
            className={`random-pin-btn random-pin-btn--primary ${!hasDroppedPin && !loading ? 'random-pin-btn--pulse' : ''}`}
            onClick={handleRandomPin}
            disabled={loading}
            title="Roll a random pin (press R)"
          >
            {loading ? '...' : '🎲 Roll the Globe'}
          </button>
          {!loading && <span className="random-pin-kbd">[R]</span>}
        </div>

        {/* First-visit welcome card: only shown if the auto-pin somehow didn't fire */}
        {!hasDroppedPin && !loading && !pin && !error && (
          <div className="welcome-card">
            <h2>Roll a pin anywhere on the globe</h2>
            <p>We'll identify the local cuisine and find you a restaurant in NYC.</p>
            <span className="welcome-arrow">👇</span>
          </div>
        )}
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
        onSearchAnyway={handleSearchAnyway}
        onReposition={handleReposition}
      />
    </div>
  )
}
