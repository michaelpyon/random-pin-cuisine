const STORAGE_KEY = 'rpc_pin_history'
const MAX_PINS = 5

export function getPinHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function addPinToHistory({ lat, lng, cuisineType, neighborhood }) {
  const pins = getPinHistory()
  const entry = {
    lat,
    lng,
    cuisineType,
    neighborhood,
    timestamp: Date.now(),
  }
  // Deduplicate by lat/lng, most recent first, max 5
  const updated = [
    entry,
    ...pins.filter((p) => !(p.lat === lat && p.lng === lng)),
  ].slice(0, MAX_PINS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

export function clearPinHistory() {
  localStorage.removeItem(STORAGE_KEY)
  return []
}

export function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 10) return 'just now'
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}min ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}

export function getPillEmoji(cuisineType) {
  if (!cuisineType) return '📍'
  // Try to grab the leading emoji from cuisineType
  const match = cuisineType.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u)
  return match ? match[0] : '📍'
}
