// Crawler-facing share route. A static Vite SPA serves one index.html with a
// fixed og:image, so a bot scraping a shared link would always see the generic
// card. This function intercepts requests that carry share params (`r`, or
// lat/lng), decodes the reveal, and returns the SAME index.html with per-result
// og:image / og:title / twitter meta injected, pointing at /api/og.
//
// Wired via a vercel.json rewrite gated on `has` query params, so param-less
// human loads still hit the static SPA directly (no added latency, iter2
// auto-pin untouched). The injected HTML still boots the SPA normally, so the
// receiver's in-app deterministic reconstruction (from `r`) is unaffected.
//
// Additive: does not touch find-restaurants.js or reverse-geocode.js.

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Decode the base64url JSON snapshot used by the client (src/utils/shareState.js).
// Kept dependency-free and defensive: any failure returns null so we fall back
// to lat/lng-only meta or the generic card.
function decodeSnapshot(encoded) {
  if (!encoded) return null
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(b64, 'base64').toString('utf-8')
    const obj = JSON.parse(json)
    if (!obj || typeof obj !== 'object') return null
    return obj
  } catch {
    return null
  }
}

function placeLabelFrom(snapshot, fallback) {
  if (snapshot && snapshot.place) return snapshot.place
  if (snapshot && snapshot.display) return snapshot.display
  return fallback
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${proto}://${host}`

  // Parse share params from the incoming URL.
  const url = new URL(req.url, origin)
  const snapshot = decodeSnapshot(url.searchParams.get('r'))

  const place = placeLabelFrom(snapshot, 'somewhere')
  const restaurant = snapshot?.r?.name || ''
  const cuisine = snapshot?.cuisine || ''

  // Per-result OG image served by the edge function.
  const ogParams = new URLSearchParams()
  ogParams.set('place', place)
  if (restaurant) ogParams.set('restaurant', restaurant)
  if (cuisine) ogParams.set('cuisine', cuisine)
  const ogImage = `${origin}/api/og?${ogParams.toString()}`

  const title = restaurant
    ? `Pin in ${place} got ${restaurant}, NYC`
    : `Pin in ${place}: ${cuisine || 'a cuisine'} in NYC`
  const description = restaurant
    ? `I dropped a pin in ${place} and got ${restaurant}, NYC${cuisine ? ` (${cuisine})` : ''}. Roll your own.`
    : `Drop a pin anywhere on the globe and find that cuisine in NYC.`

  // Fetch the canonical index.html and inject per-result meta. We append a query
  // flag so the rewrite does not loop back into this function.
  let html
  try {
    const indexRes = await fetch(`${origin}/index.html?__shell=1`)
    html = await indexRes.text()
  } catch {
    // If we cannot fetch the shell, fall back to the static SPA route untouched.
    res.statusCode = 302
    res.setHeader('Location', '/index.html')
    return res.end()
  }

  const t = escapeHtml(title)
  const d = escapeHtml(description)
  const img = escapeHtml(ogImage)

  // Replace existing og/twitter image+title+description tags; tolerant to attr order.
  html = html
    .replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/, `$1${img}$2`)
    .replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/, `$1${img}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${d}$2`)

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Bots cache aggressively; allow a short CDN cache but keep it fresh per result.
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.end(html)
}
