// shareState.js
// Encodes the full reveal (pin, place label, cuisine, chosen restaurant identity)
// into a single compact URL param so a shared link reopens the EXACT result
// deterministically, without re-running the non-deterministic geocode -> cuisine
// -> Overpass pipeline. See App.jsx (handleSharePin / mount effect) for usage.
//
// Scheme: one query param `r` holds a base64url-encoded JSON snapshot. We also
// keep the legacy `lat`/`lng` params alongside it so older links and crawlers
// that only read lat/lng still resolve (the existing reprocess fallback), and so
// the /api/og endpoint can read individual fields without decoding `r`.

// ── base64url helpers (URL-safe, no padding) ─────────────────────────────────
function toBase64Url(str) {
  // Encode UTF-8 safely (handles accented place names like Sao Paulo, etc.)
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// Short human-readable label for the pinned place, used in share text + OG card.
export function placeLabel(location) {
  if (!location) return 'somewhere'
  return (
    location.city ||
    location.county ||
    location.state ||
    location.country ||
    location.displayName ||
    'somewhere'
  )
}

// Pick the restaurant whose reveal we actually showed (the top card the user saw).
// Mirrors ResultsPanel's sort: rated first by rating desc, then unrated.
export function pickFeaturedRestaurant(restaurants) {
  if (!Array.isArray(restaurants) || restaurants.length === 0) return null
  const sorted = [...restaurants].sort((a, b) => {
    const rA = a.googleRating ?? a.stars ?? -1
    const rB = b.googleRating ?? b.stars ?? -1
    return rB - rA
  })
  return sorted[0]
}

// Build the snapshot object from a live result. Kept tiny: only what's needed to
// reconstruct a faithful reveal. We never invent data; missing fields stay absent.
export function buildShareSnapshot(result) {
  if (!result) return null
  const { location, cuisine, restaurants } = result
  const featured = pickFeaturedRestaurant(restaurants)

  const snapshot = {
    v: 1,
    lat: Number(location.lat),
    lng: Number(location.lng),
    place: placeLabel(location),
    display: location.displayName || null,
    cuisine: cuisine?.cuisineType || null,
    cuisineDesc: cuisine?.description || null,
  }

  if (featured) {
    snapshot.r = {
      name: featured.name || null,
      cuisine: Array.isArray(featured.cuisine) ? featured.cuisine.slice(0, 4) : [],
      neighborhood: featured.neighborhood || null,
      address: featured.address || null,
      lat: featured.lat ?? null,
      lon: featured.lon ?? null,
      stars: featured.stars ?? null,
      googleRating: featured.googleRating ?? null,
      googleReviewCount: featured.googleReviewCount ?? null,
      googlePriceLevel: featured.googlePriceLevel ?? null,
      osmLink: featured.osmLink || null,
      googleMapsLink: featured.googleMapsLink || null,
      website: featured.website || null,
      phone: featured.phone || null,
      openingHours: featured.openingHours || null,
    }
  }

  return snapshot
}

export function encodeShareSnapshot(snapshot) {
  return toBase64Url(JSON.stringify(snapshot))
}

export function decodeShareSnapshot(encoded) {
  try {
    const obj = JSON.parse(fromBase64Url(encoded))
    if (!obj || typeof obj !== 'object') return null
    if (!Number.isFinite(Number(obj.lat)) || !Number.isFinite(Number(obj.lng))) return null
    return obj
  } catch {
    return null
  }
}

// Reconstruct a result object (the shape App/ResultsPanel render) from a decoded
// snapshot. Returns null if the snapshot lacks the minimum reveal data, so callers
// can fall back to the lat/lng reprocess path.
export function snapshotToResult(snapshot) {
  if (!snapshot) return null
  const lat = Number(snapshot.lat)
  const lng = Number(snapshot.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  // A snapshot with no cuisine and no restaurant is not enough to render a real
  // reveal; let the caller reprocess instead.
  if (!snapshot.cuisine && !snapshot.r) return null

  const location = {
    displayName: snapshot.display || snapshot.place || 'Pinned location',
    city: snapshot.place || null,
    country: null,
    countryCode: null,
    state: null,
    county: null,
    region: null,
    lat,
    lng,
  }

  const cuisine = {
    cuisineType: snapshot.cuisine || 'Local cuisine',
    description: snapshot.cuisineDesc || '',
    osmCuisineTag: null,
    osmFallbackTag: null,
  }

  const restaurants = []
  if (snapshot.r && snapshot.r.name) {
    restaurants.push({
      name: snapshot.r.name,
      cuisine: Array.isArray(snapshot.r.cuisine) ? snapshot.r.cuisine : [],
      neighborhood: snapshot.r.neighborhood || null,
      address: snapshot.r.address || null,
      phone: snapshot.r.phone || null,
      website: snapshot.r.website || null,
      openingHours: snapshot.r.openingHours || null,
      stars: snapshot.r.stars ?? null,
      lat: snapshot.r.lat ?? null,
      lon: snapshot.r.lon ?? null,
      osmLink: snapshot.r.osmLink || null,
      googleMapsLink: snapshot.r.googleMapsLink || null,
      googleRating: snapshot.r.googleRating ?? null,
      googleReviewCount: snapshot.r.googleReviewCount ?? null,
      googlePriceLevel: snapshot.r.googlePriceLevel ?? null,
    })
  }

  return {
    location,
    cuisine,
    restaurants,
    noMatch: restaurants.length === 0,
    enriching: false,
    // Marks this result as reconstructed from a shared link (vs a live pipeline run).
    fromShare: true,
  }
}
