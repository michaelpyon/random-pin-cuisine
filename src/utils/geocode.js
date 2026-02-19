const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'

export async function reverseGeocode(lat, lng) {
  // Use higher zoom for more specific location data (city/town level)
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: 'json',
    'accept-language': 'en',
    zoom: 10,
  })

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': 'RandomPinCuisineFinder/1.0' },
  })

  if (!res.ok) {
    throw new Error('Geocoding failed')
  }

  const data = await res.json()

  if (data.error) {
    return null
  }

  return {
    displayName: data.display_name,
    country: data.address?.country,
    countryCode: data.address?.country_code,
    state: data.address?.state,
    city: data.address?.city || data.address?.town || data.address?.village,
    county: data.address?.county,
    region: data.address?.region,
  }
}

export function isOcean(lat, lng, geocodeResult) {
  return geocodeResult === null
}

export function isAntarctica(lat) {
  return lat < -60
}

export function getRandomLandCoords() {
  const continents = [
    { name: 'Europe', latMin: 35, latMax: 70, lngMin: -10, lngMax: 40, weight: 15 },
    { name: 'Asia', latMin: 5, latMax: 55, lngMin: 40, lngMax: 145, weight: 30 },
    { name: 'Africa', latMin: -35, latMax: 37, lngMin: -17, lngMax: 51, weight: 20 },
    { name: 'North America', latMin: 15, latMax: 60, lngMin: -130, lngMax: -60, weight: 15 },
    { name: 'South America', latMin: -55, latMax: 12, lngMin: -80, lngMax: -35, weight: 12 },
    { name: 'Oceania', latMin: -45, latMax: -10, lngMin: 110, lngMax: 180, weight: 8 },
  ]

  const totalWeight = continents.reduce((sum, c) => sum + c.weight, 0)
  let rand = Math.random() * totalWeight
  let selected = continents[0]
  for (const c of continents) {
    rand -= c.weight
    if (rand <= 0) {
      selected = c
      break
    }
  }

  const lat = selected.latMin + Math.random() * (selected.latMax - selected.latMin)
  const lng = selected.lngMin + Math.random() * (selected.lngMax - selected.lngMin)

  return { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 }
}
