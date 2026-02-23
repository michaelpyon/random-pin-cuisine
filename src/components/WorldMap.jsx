import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
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

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function FlyToPin({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], 5, { duration: 1.2 })
    }
  }, [lat, lng, map])
  return null
}

export default function WorldMap({ pin, onMapClick }) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxZoom={12}
      className="world-map"
      zoomControl={true}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
      />
      <MapClickHandler onMapClick={onMapClick} />
      {pin && (
        <>
          <Marker position={[pin.lat, pin.lng]} icon={pinIcon} />
          <FlyToPin lat={pin.lat} lng={pin.lng} />
        </>
      )}
    </MapContainer>
  )
}
