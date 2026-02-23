import { useEffect, useState } from 'react'
import { timeAgo, getPillEmoji } from '../utils/pinHistory'

export default function PinHistory({ pins, onSelect, onClear }) {
  // Re-render every 30s so "2min ago" stays fresh
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Empty state — ghost placeholder so the feature is discoverable on first visit
  if (!pins || pins.length === 0) {
    return (
      <div className="pin-history-strip pin-history-strip--empty" aria-label="Recent pins (empty)">
        <span className="pin-history-ghost">📍 Your recent pins will appear here</span>
      </div>
    )
  }

  return (
    <div className="pin-history-strip" role="navigation" aria-label="Recent pins">
      <span className="pin-history-label">Recent</span>

      <div className="pin-history-pills">
        {pins.map((pin, i) => (
          <button
            key={`${pin.lat}-${pin.lng}-${i}`}
            className="pin-history-pill"
            onClick={() => onSelect(pin.lat, pin.lng)}
            title={`${pin.cuisineType || 'Unknown cuisine'} · ${pin.lat.toFixed(3)}, ${pin.lng.toFixed(3)}`}
          >
            <span className="pill-emoji">{getPillEmoji(pin.cuisineType)}</span>
            <span className="pill-text">
              {pin.neighborhood || 'Unknown'}
              <span className="pill-time">{timeAgo(pin.timestamp)}</span>
            </span>
          </button>
        ))}
      </div>

      <button
        className="pin-history-clear"
        onClick={onClear}
        title="Clear recent pins"
        aria-label="Clear recent pins"
      >
        ×
      </button>
    </div>
  )
}
