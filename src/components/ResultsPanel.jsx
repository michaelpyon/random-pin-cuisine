import { useState, useEffect } from 'react'
import { getBadges } from '../utils/badges'
import NYCMiniMap from './NYCMiniMap'

export default function ResultsPanel({ result, loading, error, onClose, searchCenter, searchRadius, onCenterChange, onRadiusChange }) {
  if (!loading && !result && !error) return null

  return (
    <div className={`results-panel ${loading || result || error ? 'open' : ''}`}>
      <button className="results-close" onClick={onClose} aria-label="Close">
        &times;
      </button>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {result && !loading && (
        <ResultContent
          result={result}
          searchCenter={searchCenter}
          searchRadius={searchRadius}
          onCenterChange={onCenterChange}
          onRadiusChange={onRadiusChange}
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
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p className="loading-message" key={msgIndex} style={{ animation: 'fade-msg 0.4s ease-in' }}>
        {LOADING_MESSAGES[msgIndex]}
      </p>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="error-state">
      <span className="error-icon">oops</span>
      <p>{message}</p>
    </div>
  )
}

function ResultContent({ result, searchCenter, searchRadius, onCenterChange, onRadiusChange }) {
  const { location, cuisine, restaurants } = result

  return (
    <div className="result-content result-slide-in">
      <div className="result-section location-section">
        <h3 className="section-label">🌍 Pin dropped near</h3>
        <p className="location-name">{location.displayName}</p>
        <p className="coordinates">
          {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
        </p>
      </div>

      <div className="result-divider" />

      <div className="result-section cuisine-section">
        <h3 className="section-label">🍽️ Local cuisine</h3>
        <p className="cuisine-type">{cuisine.cuisineType}</p>
        <p className="cuisine-desc">{cuisine.description}</p>
      </div>

      <div className="result-divider" />

      <div className="result-section minimap-section">
        <NYCMiniMap
          center={searchCenter}
          radius={searchRadius}
          onCenterChange={onCenterChange}
          onRadiusChange={onRadiusChange}
        />
      </div>

      <div className="result-divider" />

      <div className="result-section restaurant-section">
        <h3 className="section-label">
          🗽 NYC matches
          {restaurants.length > 0 && (
            <span className="match-count"> ({restaurants.length})</span>
          )}
        </h3>
        {restaurants.length > 0 ? (
          <div className="restaurant-list">
            {restaurants.map((restaurant, i) => (
              <RestaurantCard key={`${restaurant.name}-${i}`} restaurant={restaurant} index={i} />
            ))}
          </div>
        ) : (
          <div className="no-match-box">
            <p className="no-match-emoji">🔍</p>
            <p className="no-match">No matches in this area.</p>
            <p className="no-match-hint">Try expanding the search radius below.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function RestaurantCard({ restaurant, index }) {
  const badges = getBadges(restaurant.name)
  const hasBadges = badges.length > 0

  return (
    <div className={`restaurant-card ${hasBadges ? 'restaurant-card--featured' : ''}`}>
      <div className="restaurant-info">
        <div className="restaurant-header">
          <div className="restaurant-name-row">
            <span className="restaurant-rank">#{index + 1}</span>
            <h4 className="restaurant-name">{restaurant.name}</h4>
          </div>
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

        <div className="restaurant-meta">
          {restaurant.cuisine.length > 0 && (
            <p className="restaurant-categories">
              {restaurant.cuisine.join(' · ')}
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
          >
            OSM
          </a>
        </div>
      </div>
    </div>
  )
}
