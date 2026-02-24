import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const NYC_CENTER = { lat: 40.7580, lng: -73.9855 }

const nycIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  shadowSize: [33, 33],
})

/**
 * Updates local radius state on user zoom — PURELY LOCAL.
 * No callbacks to parent; no search is triggered.
 *
 * fittingRef: when true, FitToRadius is doing a programmatic fitBounds —
 * skip the zoomend handler to avoid a feedback loop.
 */
function RadiusController({ setLocalRadius, fittingRef }) {
  const map = useMap()

  useMapEvents({
    zoomend() {
      // Skip programmatic zoom events triggered by FitToRadius
      if (fittingRef && fittingRef.current) return

      const zoom = map.getZoom()
      // Map zoom levels to radius: zoom 10 = ~8km, zoom 14 = ~1km
      const newRadius = Math.round(80000 / Math.pow(2, zoom - 8))
      const clamped = Math.max(500, Math.min(newRadius, 15000))
      setLocalRadius(clamped)
    },
  })

  return null
}

/**
 * Fit map to circle bounds when radius changes.
 *
 * Uses animate: false so zoomend fires synchronously — the fittingRef is
 * still true when RadiusController's zoomend fires, so it correctly skips
 * the setLocalRadius call, preventing any feedback loop.
 */
function FitToRadius({ center, radius, fittingRef }) {
  const map = useMap()
  const prevRadius = useRef(radius)

  useEffect(() => {
    if (Math.abs(prevRadius.current - radius) > 200) {
      if (fittingRef) fittingRef.current = true
      const circle = L.circle([center.lat, center.lng], { radius })
      map.fitBounds(circle.getBounds(), { padding: [20, 20], animate: false })
      if (fittingRef) fittingRef.current = false
      prevRadius.current = radius
    }
  }, [radius, center, map]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

/**
 * Draggable center marker — updates LOCAL center state only.
 * No parent callback until user clicks "Search This Area".
 */
function DraggableCenter({ center, setLocalCenter }) {
  const markerRef = useRef(null)

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current
      if (marker) {
        const pos = marker.getLatLng()
        setLocalCenter({ lat: pos.lat, lng: pos.lng })
      }
    },
  }

  return (
    <Marker
      ref={markerRef}
      position={[center.lat, center.lng]}
      icon={nycIcon}
      draggable
      eventHandlers={eventHandlers}
    />
  )
}

const RADIUS_PRESETS = [
  { label: '1 km', value: 1000 },
  { label: '3 km', value: 3000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
]

/**
 * NYCMiniMap — fully decoupled from search.
 *
 * All interactions (zoom, drag, presets) update LOCAL state only.
 * The parent is NOT notified until the user clicks "Search This Area".
 *
 * Props:
 *   center        - initial center (from last committed search)
 *   radius        - initial radius (from last committed search)
 *   cuisineType   - displayed in the button label
 *   onSearchArea  - called with (center, radius) ONLY when button is clicked
 */
export default function NYCMiniMap({ center, radius, cuisineType, onSearchArea }) {
  // Local draft state — purely visual until user confirms
  const [localCenter, setLocalCenter] = useState(center || NYC_CENTER)
  const [localRadius, setLocalRadius] = useState(radius || 5000)
  const fittingRef = useRef(false)

  // Sync local state when parent resets (e.g. new pin dropped → new cuisine)
  useEffect(() => {
    setLocalCenter(center || NYC_CENTER)
  }, [center])

  useEffect(() => {
    setLocalRadius(radius || 5000)
  }, [radius])

  const radiusKm = (localRadius / 1000).toFixed(localRadius % 1000 === 0 ? 0 : 1)
  const buttonLabel = cuisineType
    ? `🔍 Search ${radiusKm} km · ${cuisineType}`
    : `🔍 Search This Area (${radiusKm} km)`

  return (
    <div className="nyc-minimap">
      <div className="minimap-header">
        <h3 className="minimap-title">NYC Search Area</h3>
        <span className="minimap-radius">{radiusKm} km radius</span>
      </div>

      <div className="minimap-container">
        <MapContainer
          center={[localCenter.lat, localCenter.lng]}
          zoom={12}
          className="minimap-leaflet"
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <Circle
            center={[localCenter.lat, localCenter.lng]}
            radius={localRadius}
            pathOptions={{
              color: '#f97316',
              fillColor: '#f97316',
              fillOpacity: 0.1,
              weight: 2,
            }}
          />
          <DraggableCenter center={localCenter} setLocalCenter={setLocalCenter} />
          {/* RadiusController only updates local state — NO parent callbacks */}
          <RadiusController setLocalRadius={setLocalRadius} fittingRef={fittingRef} />
          <FitToRadius center={localCenter} radius={localRadius} fittingRef={fittingRef} />
        </MapContainer>
      </div>

      {/* Preset buttons update local radius only — no search fires */}
      <div className="minimap-presets">
        {RADIUS_PRESETS.map((preset) => (
          <button
            key={preset.value}
            className={`preset-btn ${localRadius === preset.value ? 'active' : ''}`}
            onClick={() => setLocalRadius(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* THE ONLY WAY to trigger a search — explicit user action */}
      <button
        className="search-area-btn"
        onClick={() => onSearchArea?.(localCenter, localRadius)}
      >
        {buttonLabel}
      </button>

      <p className="minimap-hint">Adjust area, then click the button to search.</p>
    </div>
  )
}
