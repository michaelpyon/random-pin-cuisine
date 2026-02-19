import { useEffect, useRef, useState, useCallback } from 'react'
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

// Syncs circle radius to zoom level
function RadiusController({ center, radius, onRadiusChange }) {
  const map = useMap()

  useMapEvents({
    zoomend() {
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

// Fit map to circle bounds when radius changes
function FitToRadius({ center, radius }) {
  const map = useMap()
  const prevRadius = useRef(radius)

  useEffect(() => {
    if (Math.abs(prevRadius.current - radius) > 200) {
      const circle = L.circle([center.lat, center.lng], { radius })
      map.fitBounds(circle.getBounds(), { padding: [20, 20], animate: true })
      prevRadius.current = radius
    }
  }, [radius, center, map])

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

export default function NYCMiniMap({ center, radius, onCenterChange, onRadiusChange, onSearch }) {
  const [localCenter, setLocalCenter] = useState(center || NYC_CENTER)
  const [localRadius, setLocalRadius] = useState(radius || 5000)

  useEffect(() => {
    if (center) setLocalCenter(center)
  }, [center])

  useEffect(() => {
    if (radius) setLocalRadius(radius)
  }, [radius])

  const handleCenterChange = useCallback((newCenter) => {
    setLocalCenter(newCenter)
    onCenterChange?.(newCenter)
  }, [onCenterChange])

  const handleRadiusChange = useCallback((newRadius) => {
    setLocalRadius(newRadius)
    onRadiusChange?.(newRadius)
  }, [onRadiusChange])

  const handlePresetClick = useCallback((value) => {
    setLocalRadius(value)
    onRadiusChange?.(value)
  }, [onRadiusChange])

  const radiusKm = (localRadius / 1000).toFixed(1)

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
          <DraggableCenter center={localCenter} onCenterChange={handleCenterChange} />
          <RadiusController center={localCenter} radius={localRadius} onRadiusChange={handleRadiusChange} />
          <FitToRadius center={localCenter} radius={localRadius} />
        </MapContainer>
      </div>

      <div className="minimap-presets">
        {RADIUS_PRESETS.map((preset) => (
          <button
            key={preset.value}
            className={`preset-btn ${localRadius === preset.value ? 'active' : ''}`}
            onClick={() => handlePresetClick(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <p className="minimap-hint">Drag pin to move center. Zoom or pick a preset to adjust radius.</p>
    </div>
  )
}
