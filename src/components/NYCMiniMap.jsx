import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import LeafletSizeInvalidator from './LeafletSizeInvalidator'

const NYC_CENTER = { lat: 40.7580, lng: -73.9855 }

const nycIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  shadowSize: [33, 33],
})

/** Create a numbered circle DivIcon for a restaurant marker */
function createNumberedIcon(num, highlighted = false) {
  const bg = highlighted ? '#ffffff' : '#f97316'
  const color = highlighted ? '#f97316' : '#ffffff'
  const border = highlighted ? '2.5px solid #f97316' : '2px solid rgba(255,255,255,0.4)'
  const shadow = highlighted
    ? '0 0 0 3px rgba(249,115,22,0.4), 0 2px 8px rgba(0,0,0,0.5)'
    : '0 2px 6px rgba(0,0,0,0.45)'
  return new L.DivIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${bg};color:${color};
      border:${border};
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:700;font-family:'Inter',system-ui,sans-serif;
      box-shadow:${shadow};
      cursor:pointer;
      transition:opacity 0.15s ease, transform 0.15s ease;
    ">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
  })
}

/**
 * Renders numbered markers for each restaurant that has coordinates.
 * Clicking a marker calls onMarkerClick(index).
 * Highlighted marker (hoveredIndex) renders with inverted colors.
 */
function RestaurantMarkers({ restaurants, hoveredIndex, onMarkerClick }) {
  if (!restaurants || restaurants.length === 0) return null

  return restaurants.map((r, i) => {
    if (!r.lat || !r.lon) return null
    const num = i + 1
    const isHighlighted = hoveredIndex === i
    const icon = createNumberedIcon(num, isHighlighted)

    return (
      <Marker
        key={`r-${i}-${r.name}`}
        position={[r.lat, r.lon]}
        icon={icon}
        eventHandlers={{
          click() {
            if (onMarkerClick) onMarkerClick(i)
          },
        }}
        zIndexOffset={isHighlighted ? 1000 : 0}
      />
    )
  })
}

/**
 * Updates local radius state on user zoom — PURELY LOCAL.
 * No callbacks to parent; no search is triggered.
 *
 * fromZoomRef: set to true before calling setLocalRadius so FitToRadius
 * knows not to call fitBounds (the map is already at the right zoom).
 */
function RadiusController({ setLocalRadius, fromZoomRef }) {
  const map = useMap()

  useMapEvents({
    zoomend() {
      const zoom = map.getZoom()
      // Map zoom levels to radius: zoom 10 = ~8km, zoom 14 = ~1km
      const newRadius = Math.round(80000 / Math.pow(2, zoom - 8))
      const clamped = Math.max(500, Math.min(newRadius, 15000))
      // Mark this radius change as coming from a user zoom —
      // FitToRadius will skip fitBounds to avoid an oscillation loop.
      if (fromZoomRef) fromZoomRef.current = true
      setLocalRadius(clamped)
    },
  })

  return null
}

/**
 * Compute a LatLngBounds for a circle defined by center + radiusMeters.
 *
 * We do NOT use L.circle().getBounds() here because in Leaflet 1.9.x
 * CircleMarker.getBounds() calls this._map.layerPointToLatLng(...),
 * which throws when the circle hasn't been added to a map. Instead we
 * compute the bounding box directly with Earth-geometry math.
 */
function circleLatLngBounds(lat, lng, radiusMeters) {
  const latDelta = radiusMeters / 111320 // 1 deg lat ~ 111.32 km
  const lngDelta = radiusMeters / (111320 * Math.cos(lat * (Math.PI / 180)))
  return L.latLngBounds(
    [lat - latDelta, lng - lngDelta],
    [lat + latDelta, lng + lngDelta],
  )
}

/**
 * Fit map to circle bounds when radius changes via preset button or
 * parent prop sync. Skipped when the change originated from a user zoom
 * (the map is already at the correct zoom level in that case).
 */
function FitToRadius({ center, radius, fromZoomRef }) {
  const map = useMap()
  const prevRadius = useRef(radius)

  useEffect(() => {
    // If the radius change came from a user zoom, don't fitBounds —
    // the map is already positioned correctly and calling fitBounds
    // would trigger another zoomend, creating an oscillation loop.
    if (fromZoomRef && fromZoomRef.current) {
      fromZoomRef.current = false
      prevRadius.current = radius
      return
    }

    if (Math.abs(prevRadius.current - radius) > 200) {
      // Use our own bounds helper — NOT L.circle().getBounds() which
      // requires the circle to be on a map (crashes with undefined _map).
      const bounds = circleLatLngBounds(center.lat, center.lng, radius)
      map.fitBounds(bounds, { padding: [20, 20], animate: false })
      prevRadius.current = radius
    }
  }, [radius, center, map]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

/**
 * Listens for map clicks and moves the center pin to the clicked location.
 * Ignores clicks that originate from dragging the marker.
 */
function ClickToPlace({ setLocalCenter }) {
  useMapEvents({
    click(e) {
      setLocalCenter({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
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
 *   restaurants   - array of restaurant objects with lat/lon for numbered markers
 *   hoveredIndex  - index of currently hovered restaurant card (null = none)
 *   onMarkerClick - called with index when a numbered marker is clicked
 */
export default function NYCMiniMap({ center, radius, cuisineType, onSearchArea, restaurants, hoveredIndex, onMarkerClick }) {
  // Local draft state — purely visual until user confirms
  const [localCenter, setLocalCenter] = useState(center || NYC_CENTER)
  const [localRadius, setLocalRadius] = useState(radius || 5000)
  const fromZoomRef = useRef(false)

  // Sync local state when parent resets (e.g. new pin dropped → new cuisine)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLocalCenter(center || NYC_CENTER)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [center])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLocalRadius(radius || 5000)
    })
    return () => window.cancelAnimationFrame(frame)
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
          <LeafletSizeInvalidator />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            eventHandlers={{ add: (e) => { e.target.getContainer()?.querySelectorAll('img:not([alt])').forEach(img => img.alt = '') } }}
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
          <ClickToPlace setLocalCenter={setLocalCenter} />
          <DraggableCenter center={localCenter} setLocalCenter={setLocalCenter} />
          {/* RadiusController only updates local state — NO parent callbacks */}
          <RadiusController setLocalRadius={setLocalRadius} fromZoomRef={fromZoomRef} />
          <FitToRadius center={localCenter} radius={localRadius} fromZoomRef={fromZoomRef} />
          {/* Numbered restaurant markers */}
          <RestaurantMarkers
            restaurants={restaurants}
            hoveredIndex={hoveredIndex}
            onMarkerClick={onMarkerClick}
          />
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
