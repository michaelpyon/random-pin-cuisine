// NYC restaurant search using Overpass API (OpenStreetMap) — completely free, no API key
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Default NYC center (Midtown Manhattan)
const NYC_CENTER = { lat: 40.7580, lng: -73.9855 }

// Default search radius in meters
const DEFAULT_RADIUS = 5000

export async function findNYCRestaurants(cuisineInfo, { center, radiusMeters } = {}) {
  const { osmCuisineTag, cuisineType } = cuisineInfo
  const searchCenter = center || NYC_CENTER
  const radius = radiusMeters || DEFAULT_RADIUS

  // Try primary cuisine tag first
  let results = await queryOverpassRadius(osmCuisineTag, searchCenter, radius)

  // Fallback: try a broader/simpler tag
  if (results.length === 0 && cuisineInfo.osmFallbackTag) {
    results = await queryOverpassRadius(cuisineInfo.osmFallbackTag, searchCenter, radius)
  }

  // Second fallback: search by name substring
  if (results.length === 0) {
    results = await queryOverpassByNameRadius(cuisineType, searchCenter, radius)
  }

  if (results.length === 0) {
    return []
  }

  // Shuffle and return up to 10 restaurants
  const shuffled = results.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 10).map(formatRestaurant)
}

async function queryOverpassRadius(cuisineTag, center, radius) {
  const tag = cuisineTag.toLowerCase().replace(/\s+/g, '_')

  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="restaurant"]["cuisine"~"${tag}",i](around:${radius},${center.lat},${center.lng});
      way["amenity"="restaurant"]["cuisine"~"${tag}",i](around:${radius},${center.lat},${center.lng});
    );
    out center 50;
  `

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    if (!res.ok) return []

    const data = await res.json()
    return (data.elements || []).filter((el) => el.tags?.name)
  } catch {
    return []
  }
}

async function queryOverpassByNameRadius(searchTerm, center, radius) {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="restaurant"]["name"~"${searchTerm}",i](around:${radius},${center.lat},${center.lng});
      way["amenity"="restaurant"]["name"~"${searchTerm}",i](around:${radius},${center.lat},${center.lng});
    );
    out center 20;
  `

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    if (!res.ok) return []

    const data = await res.json()
    return (data.elements || []).filter((el) => el.tags?.name)
  } catch {
    return []
  }
}

function formatRestaurant(element) {
  const tags = element.tags || {}
  const lat = element.lat || element.center?.lat
  const lon = element.lon || element.center?.lon

  const neighborhood =
    tags['addr:neighbourhood'] ||
    tags['addr:suburb'] ||
    tags['addr:city'] ||
    tags['addr:district'] ||
    null

  const street = tags['addr:street'] || ''
  const housenumber = tags['addr:housenumber'] || ''
  const address = housenumber && street
    ? `${housenumber} ${street}`
    : street || null

  const cuisine = tags.cuisine
    ? tags.cuisine.split(';').map((c) => c.trim().replace(/_/g, ' ')).map(
        (c) => c.charAt(0).toUpperCase() + c.slice(1)
      )
    : []

  return {
    name: tags.name,
    cuisine: cuisine,
    neighborhood,
    address,
    phone: tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || null,
    openingHours: tags.opening_hours || null,
    lat,
    lon,
    osmLink: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    googleMapsLink: tags.name
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tags.name + (address ? ', ' + address + ', New York, NY' : ', New York, NY'))}`
      : null,
  }
}
