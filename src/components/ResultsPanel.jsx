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

function LoadingState() {
  const messages = [
    'Dropping pin on the globe...',
    'Interpreting local cuisine...',
    'Asking a well-traveled foodie...',
    'Scouring NYC for a match...',
    'Almost there, stay hungry...',
  ]

  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p className="loading-message">
        {messages[Math.floor(Math.random() * messages.length)]}
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
    <div className="result-content">
      <div className="result-section location-section">
        <h3 className="section-label">Pin dropped near</h3>
        <p className="location-name">{location.displayName}</p>
        <p className="coordinates">
          {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
        </p>
      </div>

      <div className="result-divider" />

      <div className="result-section cuisine-section">
        <h3 className="section-label">Local cuisine</h3>
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
          NYC matches
          {restaurants.length > 0 && (
            <span className="match-count"> ({restaurants.length})</span>
          )}
        </h3>
        {restaurants.length > 0 ? (
          <div className="restaurant-list">
            {restaurants.map((restaurant, i) => (
              <RestaurantCard key={`${restaurant.name}-${i}`} restaurant={restaurant} />
            ))}
          </div>
        ) : (
          <p className="no-match">
            Couldn't find a matching NYC restaurant in this area. Try expanding your search radius!
          </p>
        )}
      </div>
    </div>
  )
}

function RestaurantCard({ restaurant }) {
  const badges = getBadges(restaurant.name)

  return (
    <div className="restaurant-card">
      <div className="restaurant-info">
        <div className="restaurant-header">
          <h4 className="restaurant-name">{restaurant.name}</h4>
          {badges.length > 0 && (
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

        {restaurant.cuisine.length > 0 && (
          <p className="restaurant-categories">
            {restaurant.cuisine.join(' · ')}
          </p>
        )}

        {restaurant.neighborhood && (
          <p className="restaurant-neighborhood">{restaurant.neighborhood}</p>
        )}

        {restaurant.address && (
          <p className="restaurant-address">{restaurant.address}</p>
        )}

        {restaurant.phone && (
          <p className="restaurant-phone">{restaurant.phone}</p>
        )}

        {restaurant.openingHours && (
          <p className="restaurant-hours">{restaurant.openingHours}</p>
        )}

        <div className="restaurant-links">
          {restaurant.googleMapsLink && (
            <a
              href={restaurant.googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="map-link"
            >
              Google Maps &rarr;
            </a>
          )}
          {restaurant.website && (
            <a
              href={restaurant.website}
              target="_blank"
              rel="noopener noreferrer"
              className="website-link"
            >
              Website &rarr;
            </a>
          )}
          <a
            href={restaurant.osmLink}
            target="_blank"
            rel="noopener noreferrer"
            className="osm-link"
          >
            OpenStreetMap &rarr;
          </a>
        </div>
      </div>
    </div>
  )
}
