import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, ZoomControl, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom branded orange pin icon
const pinIcon = new L.DivIcon({
  className: 'custom-pin-icon',
  html: `<svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.4"/>
    </filter>
    <g filter="url(#pin-shadow)">
      <path d="M15 1C7.268 1 1 7.268 1 15C1 22 8 31 13 38C13.8 39.2 15 41 15 41C15 41 16.2 39.2 17 38C22 31 29 22 29 15C29 7.268 22.732 1 15 1Z" fill="#f97316"/>
      <path d="M15 1C7.268 1 1 7.268 1 15C1 22 8 31 13 38C13.8 39.2 15 41 15 41C15 41 16.2 39.2 17 38C22 31 29 22 29 15C29 7.268 22.732 1 15 1Z" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
      <circle cx="15" cy="15" r="6.5" fill="white" opacity="0.9"/>
    </g>
  </svg>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -44],
})

// ── Leaflet sub-components ────────────────────────────────────────────────────

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function FlyToPin({ lat, lng, suppressRef }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null) {
      // Suppress moveend tracking during programmatic flyTo so it doesn't
      // cause unnecessary state updates. Reset after animation completes.
      if (suppressRef) suppressRef.current = true
      map.flyTo([lat, lng], 5, { duration: 1.2 })
      const timer = setTimeout(() => {
        if (suppressRef) suppressRef.current = false
      }, 1400) // slightly longer than duration to be safe
      return () => clearTimeout(timer)
    }
  }, [lat, lng, map]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

/**
 * Tracks map center and reports it via callback — but ONLY on moveend, not
 * on every move frame. This prevents hundreds of state updates per zoom/pan
 * gesture and avoids triggering re-renders during FlyToPin animations.
 *
 * Also respects suppressRef: when true (set by FlyToPin during programmatic
 * flyTo), the moveend callback is skipped entirely.
 */
function MapCenterTracker({ onCenterChange, suppressRef }) {
  const map = useMapEvents({
    moveend() {
      // Skip updates driven by programmatic flyTo calls
      if (suppressRef && suppressRef.current) return
      const c = map.getCenter()
      onCenterChange(c.lat, c.lng)
    },
  })
  // Report initial center on mount
  useEffect(() => {
    const c = map.getCenter()
    onCenterChange(c.lat, c.lng)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

// ── Crosshair SVG ─────────────────────────────────────────────────────────────

function CrosshairSVG() {
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer dashed ring */}
      <circle cx="26" cy="26" r="21" stroke="#f97316" strokeWidth="2" strokeDasharray="5 3.5" opacity="0.8" />
      {/* Inner filled dot */}
      <circle cx="26" cy="26" r="6" fill="#f97316" />
      {/* White centre dot */}
      <circle cx="26" cy="26" r="2.5" fill="white" opacity="0.95" />
      {/* Cross arms */}
      <line x1="26" y1="4"  x2="26" y2="14" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <line x1="26" y1="38" x2="26" y2="48" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <line x1="4"  y1="26" x2="14" y2="26" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <line x1="38" y1="26" x2="48" y2="26" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WorldMap({ pin, onMapClick, showCrosshair, onDropPin, onPinDrag }) {
  // Live map center — updated by MapCenterTracker (on moveend only)
  const [mapCenter, setMapCenter] = useState({ lat: 20, lng: 0 })

  // Shared ref: true while FlyToPin is animating a programmatic flyTo.
  // MapCenterTracker checks this ref and skips updates during flyTo.
  const flyingSuppressRef = useRef(false)

  // "Drag to adjust" tooltip on the first pin ever placed
  const [showDragTip, setShowDragTip] = useState(false)
  const prevPinRef   = useRef(null)
  const shownTipRef  = useRef(false)
  const tipTimerRef  = useRef(null)

  useEffect(() => {
    if (pin && !prevPinRef.current && !shownTipRef.current) {
      shownTipRef.current = true
      setShowDragTip(true)
      tipTimerRef.current = setTimeout(() => setShowDragTip(false), 2800)
    }
    prevPinRef.current = pin
    return () => { if (tipTimerRef.current) clearTimeout(tipTimerRef.current) }
  }, [pin])

  const handleDropPin = () => {
    onDropPin(mapCenter.lat, mapCenter.lng)
  }

  return (
    <div className="world-map-wrapper">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={12}
        className="world-map"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        <ZoomControl position="bottomright" />
        <MapClickHandler onMapClick={onMapClick} />
        <MapCenterTracker
          onCenterChange={(lat, lng) => setMapCenter({ lat, lng })}
          suppressRef={flyingSuppressRef}
        />

        {pin && (
          <>
            <Marker
              position={[pin.lat, pin.lng]}
              icon={pinIcon}
              draggable={true}
              eventHandlers={{
                dragend(e) {
                  const { lat, lng } = e.target.getLatLng()
                  if (onPinDrag) onPinDrag(lat, lng)
                },
              }}
            >
              {showDragTip && (
                <Tooltip permanent direction="top" offset={[0, -46]} className="drag-tooltip">
                  ↕ Drag to adjust
                </Tooltip>
              )}
            </Marker>
            <FlyToPin lat={pin.lat} lng={pin.lng} suppressRef={flyingSuppressRef} />
          </>
        )}
      </MapContainer>

      {/* ── Crosshair overlay ── */}
      {showCrosshair && (
        <div className="map-crosshair" aria-hidden="true">
          <CrosshairSVG />
        </div>
      )}

      {/* ── Drop Pin Here button ── */}
      {showCrosshair && (
        <button className="drop-pin-btn" onClick={handleDropPin}>
          📍 Drop Pin Here
        </button>
      )}
    </div>
  )
}
