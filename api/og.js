// Dynamic Open Graph image: renders a 1200x630 card reading
// "Pin in {place} -> {restaurant}, NYC ({cuisine})" so every shared reveal
// unfurls with its OWN image instead of one generic static PNG.
//
// Honesty: this only ever draws values passed in the share URL, which are the
// exact place / restaurant / cuisine the user actually saw. No invented data.
//
// Runs on the edge runtime (required by @vercel/og). This is additive and does
// not touch find-restaurants.js or reverse-geocode.js.
import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

const WIDTH = 1200
const HEIGHT = 630

function clamp(value, max) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

// Build a plain React-element object (satori accepts this shape directly, so we
// avoid needing a JSX transform inside the api/ folder).
function h(type, props, ...children) {
  return { type, props: { ...props, children: children.length <= 1 ? children[0] : children } }
}

export default function handler(req) {
  const { searchParams } = new URL(req.url)
  const place = clamp(searchParams.get('place') || 'somewhere', 42)
  const restaurant = clamp(searchParams.get('restaurant') || '', 48)
  const cuisine = clamp(searchParams.get('cuisine') || '', 38)

  const headline = restaurant
    ? `${restaurant}, NYC`
    : (cuisine ? `${cuisine} in NYC` : 'a cuisine in NYC')

  const element = h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #0f1117 0%, #1b2233 60%, #2a1830 100%)',
        color: '#f5f7fa',
        padding: '64px 72px',
        fontFamily: 'sans-serif',
      },
    },
    // Top brand row
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', fontSize: 34, color: '#9aa6bd' } },
      h('span', { style: { fontSize: 44, marginRight: 18 } }, '📍'),
      h('span', { style: { fontWeight: 700, letterSpacing: '0.5px' } }, 'Random Pin Cuisine')
    ),
    // Center reveal block
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column' } },
      h(
        'div',
        { style: { fontSize: 38, color: '#9aa6bd', display: 'flex', marginBottom: 12 } },
        `Pin in ${place}`
      ),
      h(
        'div',
        { style: { fontSize: 30, color: '#6f7a92', display: 'flex', marginBottom: 22 } },
        '↓'
      ),
      h(
        'div',
        {
          style: {
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
            display: 'flex',
            color: '#ffffff',
          },
        },
        headline
      )
    ),
    // Bottom cuisine tag + CTA
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 30 } },
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 999,
            padding: '12px 26px',
            color: '#f5b942',
          },
        },
        h('span', { style: { marginRight: 12 } }, '🍽️'),
        h('span', {}, cuisine || 'Local cuisine')
      ),
      h('div', { style: { display: 'flex', color: '#9aa6bd' } }, 'Roll your own →')
    )
  )

  return new ImageResponse(element, {
    width: WIDTH,
    height: HEIGHT,
  })
}
