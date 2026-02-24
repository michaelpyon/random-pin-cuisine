import { useState, useEffect, useCallback } from 'react'
import { getBadges } from '../utils/badges'
import NYCMiniMap from './NYCMiniMap'

// ── Favorites helpers ─────────────────────────────────────────────────────────
const FAV_KEY = 'rpc-favorites'

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]')
  } catch {
    return []
  }
}

function saveFavorites(favs) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(favs))
  } catch {}
}

function favId(restaurant) {
  return `${restaurant.name}|${restaurant.lat}|${restaurant.lon}`
}

// ── Star display (legacy — used by SavedCard which only has OSM stars) ────────
function StarDisplay({ stars }) {
  if (stars === null || stars === undefined) {
    return null
  }
  const full = Math.floor(stars)
  const empty = 5 - full
  return (
    <span className="restaurant-stars" title={`${stars} / 5 stars`}>
      {'★'.repeat(full)}{'☆'.repeat(empty)}
    </span>
  )
}

/**
 * Rich rating display for RestaurantCard.
 * Prefers Google Places data; falls back to OSM stars; returns null on miss.
 *   ★★★★☆ 4.2 · 312 reviews  $$$
 */
function RatingDisplay({ googleRating, googleReviewCount, googlePriceLevel, osmStars }) {
  const rating = googleRating ?? osmStars

  // No data at all — render nothing (don't clutter every card with "No rating")
  if (rating === null || rating === undefined) {
    return null
  }

  const full = Math.floor(rating)
  const empty = 5 - full

  return (
    <span className="restaurant-rating-row">
      <span className="restaurant-stars" title={`${Number(rating).toFixed(1)} / 5 stars`}>
        {'★'.repeat(full)}{'☆'.repeat(empty)}
      </span>
      <span className="restaurant-rating-value">{Number(rating).toFixed(1)}</span>
      {googleReviewCount != null && (
        <span className="restaurant-review-count">
          · {googleReviewCount.toLocaleString()} reviews
        </span>
      )}
      {googlePriceLevel != null && (
        <span className="restaurant-price-level">{'$'.repeat(googlePriceLevel)}</span>
      )}
    </span>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function ResultsPanel({ result, loading, error, onClose, onSharePin, shareToast, searchCenter, searchRadius, onCenterChange, onRadiusChange, onReposition }) {
  if (!loading && !result && !error) return null

  return (
    <div className={`results-panel ${loading || result || error ? 'open' : ''}`}>
      {/* Mobile drag handle */}
      <div className="panel-drag-handle" />

      <button className="results-close" onClick={onClose} aria-label="Close" title="Close (Esc)">
        &times;
        <span className="close-kbd-hint">Esc</span>
      </button>

      {/* Share toast */}
      {shareToast && (
        <div className="share-toast" role="status">
          ✅ Link copied to clipboard!
        </div>
      )}

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={onClose} />}
      {result && !loading && (
        <ResultContent
          result={result}
          onSharePin={onSharePin}
          searchCenter={searchCenter}
          searchRadius={searchRadius}
          onCenterChange={onCenterChange}
          onRadiusChange={onRadiusChange}
          onReposition={onReposition}
        />
      )}
    </div>
  )
}

const LOADING_MESSAGES = [
  'Consulting the bodega cats...',
  'Asking a well-traveled cab driver...',
  'Bribing the pizza rats for intel...',
  'Checking with the subway pigeons...',
  'Interrogating a street cart vendor...',
  'Waking up a sleeping sommelier...',
  'Dropping pin on the globe...',
  'Decoding local cuisine signals...',
  'Scouring NYC for a match...',
  'Almost there, stay hungry...',
]

function LoadingState() {
  const [msgIndex, setMsgIndex] = useState(() => Math.floor(Math.random() * LOADING_MESSAGES.length))

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="loading-state">
      <div className="loading-ring">
        <div className="loading-ring-inner" />
        <span className="loading-ring-emoji">🍽️</span>
      </div>
      <p className="loading-message" key={msgIndex} style={{ animation: 'fade-msg 0.4s ease-in' }}>
        {LOADING_MESSAGES[msgIndex]}
      </p>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <span className="error-icon">⚠️ Oops</span>
      <p>{message}</p>
      {onRetry && (
        <button className="error-retry-btn" onClick={onRetry}>
          Try a different pin →
        </button>
      )}
    </div>
  )
}

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function ResultContent({ result, onSharePin, searchCenter, searchRadius, onCenterChange, onRadiusChange, onReposition }) {
  const { location, cuisine, restaurants } = result

  // ── Favorites state ─────────────────────────────────────────────────────────
  const [favorites, setFavorites] = useState(loadFavorites)

  const toggleFavorite = useCallback((restaurant) => {
    setFavorites(prev => {
      const id = favId(restaurant)
      const exists = prev.some(f => favId(f) === id)
      let next
      if (exists) {
        next = prev.filter(f => favId(f) !== id)
      } else {
        // Compute distance label for saved entry
        let distanceLabel = null
        if (restaurant.lat && restaurant.lon && searchCenter) {
          const km = haversineKm(searchCenter.lat, searchCenter.lng, restaurant.lat, restaurant.lon)
          distanceLabel = km < 1
            ? `${Math.round(km * 1000)} m away`
            : `${km.toFixed(1)} km away`
        }
        next = [...prev, {
          name: restaurant.name,
          cuisine: restaurant.cuisine,
          lat: restaurant.lat,
          lon: restaurant.lon,
          distance: distanceLabel,
          url: restaurant.googleMapsLink || restaurant.osmLink,
          stars: restaurant.stars,
          savedAt: Date.now(),
        }]
      }
      saveFavorites(next)
      return next
    })
  }, [searchCenter])

  // ── Filter state ─────────────────────────────────────────────────────────────
  // Tab: 'all' | 'saved'
  const [activeTab, setActiveTab] = useState('all')
  // Cuisine filter: null = All, 'rated' = Rated Only, string = cuisine type
  const [cuisineFilter, setCuisineFilter] = useState(null)

  // Build unique cuisine pills from restaurants
  const allCuisines = [...new Set(
    restaurants.flatMap(r => r.cuisine).filter(Boolean)
  )].slice(0, 6)

  const hasRated = restaurants.some(r => r.stars !== null && r.stars !== undefined)

  // Which restaurants to show
  const favIds = new Set(favorites.map(favId))

  // Sort restaurants: rated first (by Google rating desc), then unrated
  const sortedRestaurants = [...restaurants].sort((a, b) => {
    const rA = a.googleRating ?? a.stars ?? -1
    const rB = b.googleRating ?? b.stars ?? -1
    return rB - rA
  })

  let displayed = sortedRestaurants
  if (activeTab === 'saved') {
    displayed = favorites
  } else {
    if (cuisineFilter === 'rated') {
      displayed = sortedRestaurants.filter(r => (r.googleRating ?? r.stars) != null)
    } else if (cuisineFilter) {
      displayed = sortedRestaurants.filter(r =>
        r.cuisine.some(c => c.toLowerCase() === cuisineFilter.toLowerCase())
      )
    }
  }

  const favCount = favorites.length

  return (
    <div className="result-content result-slide-in">
      <div className="result-section location-section">
        <h3 className="section-label">🌍 Pin dropped near</h3>
        <div className="location-row">
          <div>
            <p className="location-name">{location.displayName}</p>
            <p className="coordinates">
              {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
            </p>
          </div>
          <div className="location-actions">
            {onReposition && (
              <button
                className="reposition-btn"
                onClick={onReposition}
                title="Pan map and re-drop the pin"
              >
                🔄 Reposition
              </button>
            )}
            <button
              className="share-pin-btn"
              onClick={onSharePin}
              title="Copy shareable link"
            >
              <span className="share-pin-icon">🔗</span>
              <span className="share-pin-label">Share</span>
            </button>
          </div>
        </div>
      </div>

      <div className="result-divider" />

      <div className="result-section cuisine-section">
        <h3 className="section-label">🍽️ Local cuisine</h3>
        <div className="cuisine-hero">
          <p className="cuisine-type">{cuisine.cuisineType}</p>
        </div>
        <p className="cuisine-desc">{cuisine.description}</p>
      </div>

      <div className="result-divider" />

      <div className="result-section restaurant-section">
        {/* Header row: title + tabs */}
        <div className="restaurant-header-row">
          <h3 className="section-label">
            🗽 NYC matches
            {restaurants.length > 0 && (
              <span className="match-count"> ({restaurants.length})</span>
            )}
          </h3>
          <div className="restaurant-tabs">
            <button
              className={`restaurant-tab ${activeTab === 'all' ? 'restaurant-tab--active' : ''}`}
              onClick={() => { setActiveTab('all'); setCuisineFilter(null) }}
            >
              All
            </button>
            <button
              className={`restaurant-tab ${activeTab === 'saved' ? 'restaurant-tab--active' : ''}`}
              onClick={() => setActiveTab('saved')}
            >
              ⭐ Saved
              {favCount > 0 && (
                <span className="tab-badge">{favCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Filter pills — only in "All" tab */}
        {activeTab === 'all' && (allCuisines.length > 0 || hasRated) && (
          <div className="cuisine-filter-pills">
            <button
              className={`filter-pill ${cuisineFilter === null ? 'filter-pill--active' : ''}`}
              onClick={() => setCuisineFilter(null)}
            >
              All
            </button>
            {allCuisines.map(c => (
              <button
                key={c}
                className={`filter-pill ${cuisineFilter === c ? 'filter-pill--active' : ''}`}
                onClick={() => setCuisineFilter(cuisineFilter === c ? null : c)}
              >
                {c}
              </button>
            ))}
            {hasRated && (
              <button
                className={`filter-pill filter-pill--stars ${cuisineFilter === 'rated' ? 'filter-pill--active' : ''}`}
                onClick={() => setCuisineFilter(cuisineFilter === 'rated' ? null : 'rated')}
              >
                ⭐ Rated Only
              </button>
            )}
          </div>
        )}

        {/* Restaurant list */}
        {activeTab === 'saved' ? (
          favorites.length === 0 ? (
            <div className="no-match-box">
              <p className="no-match-emoji">⭐</p>
              <p className="no-match">No saved spots yet.</p>
              <p className="no-match-hint">Tap ⭐ on any restaurant to save it.</p>
            </div>
          ) : (
            <div className="restaurant-list">
              {favorites.map((fav, i) => (
                <SavedCard
                  key={favId(fav)}
                  restaurant={fav}
                  index={i}
                  onUnsave={() => toggleFavorite(fav)}
                />
              ))}
            </div>
          )
        ) : displayed.length > 0 ? (
          <div className="restaurant-list">
            {displayed.map((restaurant, i) => {
              // Mark top pick: first card AND has a rating of 4.0+ 
              const topRating = restaurant.googleRating ?? restaurant.stars
              const topPickEligible = i === 0 && topRating != null && topRating >= 4.0
              return (
                <RestaurantCard
                  key={`${restaurant.name}-${i}`}
                  restaurant={restaurant}
                  index={i}
                  searchCenter={searchCenter}
                  isFavorited={favIds.has(favId(restaurant))}
                  onToggleFavorite={() => toggleFavorite(restaurant)}
                  isTopPick={topPickEligible}
                />
              )
            })}
          </div>
        ) : (
          <div className="no-match-box">
            <p className="no-match-emoji">🔍</p>
            <p className="no-match">No restaurants found in this area.</p>
            <p className="no-match-hint">Try expanding the search radius using the NYC map below.</p>
          </div>
        )}
      </div>

      <div className="result-divider" />

      <div className="result-section minimap-section">
        <p className="minimap-context-hint">
          Adjust where in NYC to search for <strong>{cuisine.cuisineType}</strong> restaurants:
        </p>
        <NYCMiniMap
          center={searchCenter}
          radius={searchRadius}
          onCenterChange={onCenterChange}
          onRadiusChange={onRadiusChange}
        />
      </div>
    </div>
  )
}

function RestaurantCard({ restaurant, index, searchCenter, isFavorited, onToggleFavorite, isTopPick }) {
  const badges = getBadges(restaurant.name)
  const hasBadges = badges.length > 0

  // Compute distance from search center if coordinates are available
  let distanceLabel = null
  if (restaurant.lat && restaurant.lon && searchCenter) {
    const km = haversineKm(searchCenter.lat, searchCenter.lng, restaurant.lat, restaurant.lon)
    distanceLabel = km < 1
      ? `${Math.round(km * 1000)} m`
      : `${km.toFixed(1)} km`
  }

  return (
    <div
      className={`restaurant-card ${hasBadges ? 'restaurant-card--featured' : ''} ${isTopPick ? 'restaurant-card--top-pick' : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="restaurant-card-accent" />
      <div className="restaurant-info">
        <div className="restaurant-header">
          <div className="restaurant-name-row">
            <h4 className="restaurant-name">{restaurant.name}</h4>
            {isTopPick && (
              <span className="top-pick-badge">⭐ Top Rated</span>
            )}
            {/* Favorite toggle button */}
            <button
              className={`fav-btn ${isFavorited ? 'fav-btn--active' : ''}`}
              onClick={onToggleFavorite}
              title={isFavorited ? 'Remove from saved' : 'Save restaurant'}
              aria-label={isFavorited ? 'Remove from saved' : 'Save restaurant'}
            >
              {isFavorited ? '★' : '☆'}
            </button>
          </div>
          <div className="restaurant-header-right">
            {distanceLabel && (
              <span className="restaurant-distance">{distanceLabel}</span>
            )}
            {/* Rating: Google Places preferred, OSM stars as fallback */}
            <RatingDisplay
              googleRating={restaurant.googleRating}
              googleReviewCount={restaurant.googleReviewCount}
              googlePriceLevel={restaurant.googlePriceLevel}
              osmStars={restaurant.stars}
            />
            {hasBadges && (
              <div className="restaurant-badges">
                {badges.map((badge) => (
                  <span
                    key={badge.key}
                    className="badge"
                    style={{ backgroundColor: badge.color }}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="restaurant-meta">
          {restaurant.cuisine.length > 0 && (
            <p className="restaurant-categories">
              {restaurant.cuisine.slice(0, 3).join(' · ')}
            </p>
          )}

          {(restaurant.neighborhood || restaurant.address) && (
            <p className="restaurant-location">
              📍 {[restaurant.neighborhood, restaurant.address].filter(Boolean).join(', ')}
            </p>
          )}

          {restaurant.phone && (
            <p className="restaurant-phone">📞 {restaurant.phone}</p>
          )}

          {restaurant.openingHours && (
            <p className="restaurant-hours">🕐 {restaurant.openingHours}</p>
          )}
        </div>

        <div className="restaurant-links">
          {restaurant.googleMapsLink && (
            <a
              href={restaurant.googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="restaurant-link-btn"
            >
              Maps
            </a>
          )}
          {restaurant.website && (
            <a
              href={restaurant.website}
              target="_blank"
              rel="noopener noreferrer"
              className="restaurant-link-btn"
            >
              Website
            </a>
          )}
          <a
            href={restaurant.osmLink}
            target="_blank"
            rel="noopener noreferrer"
            className="restaurant-link-btn restaurant-link-btn--secondary"
            title="View on OpenStreetMap"
          >
            Source
          </a>
        </div>
      </div>
    </div>
  )
}

/** Compact card shown in the Saved tab */
function SavedCard({ restaurant, index, onUnsave }) {
  return (
    <div
      className="restaurant-card restaurant-card--saved"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="restaurant-card-accent" style={{ opacity: 1 }} />
      <div className="restaurant-info">
        <div className="restaurant-header">
          <div className="restaurant-name-row">
            <span className="restaurant-rank">#{index + 1}</span>
            <h4 className="restaurant-name">{restaurant.name}</h4>
            <button
              className="fav-btn fav-btn--active"
              onClick={onUnsave}
              title="Remove from saved"
              aria-label="Remove from saved"
            >
              ★
            </button>
          </div>
          {restaurant.distance && (
            <div className="restaurant-header-right">
              <span className="restaurant-distance">{restaurant.distance}</span>
              <StarDisplay stars={restaurant.stars} />
            </div>
          )}
        </div>

        <div className="restaurant-meta">
          {restaurant.cuisine && restaurant.cuisine.length > 0 && (
            <p className="restaurant-categories">
              {restaurant.cuisine.join(' · ')}
            </p>
          )}
        </div>

        {restaurant.url && (
          <div className="restaurant-links">
            <a
              href={restaurant.url}
              target="_blank"
              rel="noopener noreferrer"
              className="restaurant-link-btn"
            >
              Maps
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
