import { withCache } from './_lib/redis-cache.js'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng query params are required' })
  }

  const cacheKey = `reverse:${lat.toFixed(4)}:${lng.toFixed(4)}`

  try {
    const payload = await withCache(cacheKey, CACHE_TTL_MS, async () => {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        format: 'json',
        'accept-language': 'en',
        zoom: '10',
      })

      const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: {
          'User-Agent': process.env.NOMINATIM_USER_AGENT || 'RandomPinCuisine/1.0',
        },
      })

      if (!response.ok) {
        throw new Error(`Nominatim returned HTTP ${response.status}`)
      }

      const data = await response.json()
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
    })

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json({ location: payload })
  } catch (error) {
    return res.status(502).json({ error: error.message })
  }
}

