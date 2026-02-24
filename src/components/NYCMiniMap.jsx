import { useEffect, useRef } from 'react'
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
 * Syncs circle radius to zoom level.
 *
 * fittingRef: when true, FitToRadius is doing a programmatic fitBounds —
 * skip the zoomend handler to avoid a feedback loop where:
 *   onRadiusChange → new radius prop → FitToRadius.fitBounds → zoomend →
 *   onRadiusChange → … (infinite loop triggering a restaurant re-search each time)
 */
function RadiusController({ radius, onRadiusChange, fittingRef }) {
  const map = useMap()

  useMapEvents({
    zoomend() {
      // Skip programmatic zoom events triggered by FitToRadius
      if (fittingRef && fittingRef.current) return

      const zoom = map.getZoom()
      // Map zoom levels to radius: zoom 10 = ~8km, zoom 14 = ~1km
      const newRadius = Math.round(80000 / Math.pow(2, zoom - 8))
      const clamped = Math.max(500, Math.min(newRadius, 15000))
      if (clamped !== radius) {
        onRadiusChange(clamped)
      }
    },
  })

  return null
}

/**
 * Fit map to circle bounds when radius changes.
 *
 * Uses animate: false so zoomend fires synchronously — the fittingRef is
 * still true when RadiusController's zoomend fires, so it correctly skips
 * the radius-update callback, breaking the feedback loop.
 */
function FitToRadius({ center, radius, fittingRef }) {
  const map = useMap()
  const prevRadius = useRef(radius)

  useEffect(() => {
    if (Math.abs(prevRadius.current - radius) > 200) {
      // Mark as programmatic so RadiusController ignores the resulting zoomend
      if (fittingRef) fittingRef.current = true
      const circle = L.circle([center.lat, center.lng], { radius })
      // animate: false → zoomend fires synchronously, fittingRef is still true
      map.fitBounds(circle.getBounds(), { padding: [20, 20], animate: false })
      if (fittingRef) fittingRef.current = false
      prevRadius.current = radius
    }
  }, [radius, center, map]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

// Allow dragging the center marker
function DraggableCenter({ center, onCenterChange }) {
  const markerRef = useRef(null)

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current
      if (marker) {
        const pos = marker.getLatLng()
        onCenterChange({ lat: pos.lat, lng: pos.lng })
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

export default function NYCMiniMap({ center, radius, onCenterChange, onRadiusChange }) {
  // Shared ref: true while FitToRadius is executing a programmatic fitBounds.
  // Prevents RadiusController from treating that zoom as a user gesture and
  // calling onRadiusChange, which would re-trigger a restaurant search and
  // cause another fitBounds → infinite loop.
  const fittingRef = useRef(false)

  // Fully controlled component — no local mirror state.
  // Parent owns center/radius; this component reports changes up via callbacks.
  const activeCenter = center || NYC_CENTER
  const activeRadius = radius || 5000
  const radiusKm = (activeRadius / 1000).toFixed(1)

  return (
    <div className="nyc-minimap">
      <div className="minimap-header">
        <h3 className="minimap-title">NYC Search Area</h3>
        <span className="minimap-radius">{radiusKm} km radius</span>
      </div>

      <div className="minimap-container">
        <MapContainer
          center={[activeCenter.lat, activeCenter.lng]}
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
            center={[activeCenter.lat, activeCenter.lng]}
            radius={activeRadius}
            pathOptions={{
              color: '#f97316',
              fillColor: '#f97316',
              fillOpacity: 0.1,
              weight: 2,
            }}
          />
          <DraggableCenter center={activeCenter} onCenterChange={onCenterChange} />
          <RadiusController
            radius={activeRadius}
            onRadiusChange={onRadiusChange}
            fittingRef={fittingRef}
          />
          <FitToRadius center={activeCenter} radius={activeRadius} fittingRef={fittingRef} />
        </MapContainer>
      </div>

      <div className="minimap-presets">
        {RADIUS_PRESETS.map((preset) => (
          <button
            key={preset.value}
            className={`preset-btn ${activeRadius === preset.value ? 'active' : ''}`}
            onClick={() => onRadiusChange?.(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <p className="minimap-hint">Drag pin to move center. Zoom or pick a preset to adjust radius.</p>
    </div>
  )
}
