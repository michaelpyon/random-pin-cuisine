import { withCache } from './_lib/cache.js'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const OVERPASS_TTL_MS = 1000 * 60 * 60
const GOOGLE_TTL_MS = 1000 * 60 * 60 * 24
const DEFAULT_RADIUS = 5000

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const center = parseCenter(req.query.lat, req.query.lng)
  if (!center) {
    return res.status(400).json({ error: 'lat and lng query params are required' })
  }

  const radius = clampRadius(req.query.radius)
  const unfiltered = req.query.unfiltered === '1'
  const cuisineTag = readString(req.query.cuisineTag)
  const fallbackTag = readString(req.query.fallbackTag)
  const cuisineType = readString(req.query.cuisineType) || 'restaurant'

  try {
    let rawResults = []

    if (unfiltered) {
      rawResults = await queryUnfiltered(center, radius)
    } else {
      if (!cuisineTag) {
        return res.status(400).json({ error: 'cuisineTag is required' })
      }

      rawResults = await queryOverpassRadius(cuisineTag, center, radius)

      if (rawResults.length === 0 && fallbackTag) {
        rawResults = await queryOverpassRadius(fallbackTag, center, radius)
      }

      if (rawResults.length === 0) {
        rawResults = await queryOverpassByNameRadius(cuisineType, center, radius)
      }
    }

    const deduped = dedupeElements(rawResults)
    const formatted = deduped.slice(0, 10).map(formatRestaurant)
    const enriched = await enrichRestaurants(formatted)

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

    if (enriched.length === 0) {
      return res.status(200).json({
        results: [],
        noMatch: !unfiltered,
        cuisineType,
      })
    }

    return res.status(200).json({
      results: shuffle(enriched),
      noMatch: false,
      cuisineType,
    })
  } catch (error) {
    return res.status(502).json({ error: error.message })
  }
}

function parseCenter(lat, lng) {
  const parsedLat = Number(lat)
  const parsedLng = Number(lng)
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    return null
  }
  return { lat: parsedLat, lng: parsedLng }
}

function readString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function clampRadius(radius) {
  const parsed = Number(radius)
  if (!Number.isFinite(parsed)) return DEFAULT_RADIUS
  return Math.min(Math.max(parsed, 500), 15000)
}

async function queryUnfiltered(center, radius) {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="restaurant"](around:${radius},${center.lat},${center.lng});
      way["amenity"="restaurant"](around:${radius},${center.lat},${center.lng});
    );
    out center 50;
  `
  return queryOverpass(query)
}

async function queryOverpassRadius(cuisineTag, center, radius) {
  const tag = cuisineTag.toLowerCase().replace(/\s+/g, '_')
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="restaurant"]["cuisine"~"(^|;) *${tag} *(;|$)",i](around:${radius},${center.lat},${center.lng});
      way["amenity"="restaurant"]["cuisine"~"(^|;) *${tag} *(;|$)",i](around:${radius},${center.lat},${center.lng});
    );
    out center 50;
  `
  return queryOverpass(query)
}

async function queryOverpassByNameRadius(searchTerm, center, radius) {
  const safeTerm = searchTerm.replace(/"/g, '')
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="restaurant"]["name"~"${safeTerm}",i](around:${radius},${center.lat},${center.lng});
      way["amenity"="restaurant"]["name"~"${safeTerm}",i](around:${radius},${center.lat},${center.lng});
    );
    out center 20;
  `
  return queryOverpass(query)
}

async function queryOverpass(query) {
  const cacheKey = `overpass:${query.trim()}`
  return withCache(cacheKey, OVERPASS_TTL_MS, async () => {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    if (!response.ok) {
      throw new Error(`Overpass returned HTTP ${response.status}`)
    }

    const data = await response.json()
    return (data.elements || []).filter((element) => element.tags?.name)
  })
}

function dedupeElements(elements) {
  const seen = new Set()
  const unique = []

  for (const element of elements) {
    const tags = element.tags || {}
    const key = `${tags.name || ''}|${tags['addr:housenumber'] || ''}|${tags['addr:street'] || ''}`
    if (!tags.name || seen.has(key)) {
      continue
    }
    seen.add(key)
    unique.push(element)
  }

  return unique
}

function parseStars(tags) {
  const raw =
    tags.stars ||
    tags.rating ||
    tags['cuisine:stars'] ||
    tags['michelin:stars'] ||
    tags['survey:stars'] ||
    null

  if (!raw) return null

  const parsed = parseFloat(raw)
  if (Number.isNaN(parsed)) return null
  return Math.min(5, Math.max(0, parsed))
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
  const address = housenumber && street ? `${housenumber} ${street}` : street || null

  const cuisine = tags.cuisine
    ? tags.cuisine
        .split(';')
        .map((value) => value.trim().replace(/_/g, ' '))
        .map((value) => value.charAt(0).toUpperCase() + value.slice(1))
    : []

  return {
    name: tags.name,
    cuisine,
    neighborhood,
    address,
    phone: tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || null,
    openingHours: tags.opening_hours || null,
    stars: parseStars(tags),
    lat,
    lon,
    osmLink: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    googleMapsLink: tags.name
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tags.name + (address ? `, ${address}, New York, NY` : ', New York, NY'))}`
      : null,
  }
}

async function enrichRestaurants(restaurants) {
  if (!process.env.GOOGLE_MAPS_API_KEY || restaurants.length === 0) {
    return restaurants
  }

  return mapWithConcurrency(restaurants, 3, async (restaurant) => {
    if (restaurant.lat == null || restaurant.lon == null) {
      return restaurant
    }

    const cacheKey = `google:${restaurant.name}|${Number(restaurant.lat).toFixed(4)}|${Number(restaurant.lon).toFixed(4)}`
    const placeData = await withCache(cacheKey, GOOGLE_TTL_MS, async () => {
      const params = new URLSearchParams({
        input: `${restaurant.name} ${restaurant.address || ''} New York`,
        inputtype: 'textquery',
        fields: 'rating,user_ratings_total,price_level',
        locationbias: `circle:500@${restaurant.lat},${restaurant.lon}`,
        key: process.env.GOOGLE_MAPS_API_KEY,
      })

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`
      )

      if (!response.ok) {
        throw new Error(`Google Places returned HTTP ${response.status}`)
      }

      const data = await response.json()
      const candidate = data.candidates?.[0]

      return {
        googleRating: candidate?.rating ?? null,
        googleReviewCount: candidate?.user_ratings_total ?? null,
        googlePriceLevel: candidate?.price_level ?? null,
      }
    })

    return {
      ...restaurant,
      ...placeData,
    }
  })
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex
      nextIndex += 1
      results[current] = await mapper(items[current], current)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  )

  return results
}

function shuffle(items) {
  const cloned = [...items]
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cloned[i], cloned[j]] = [cloned[j], cloned[i]]
  }
  return cloned
}

