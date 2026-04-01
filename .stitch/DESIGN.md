# random-pin-cuisine Design System (Stitch Extract)

Extracted from Stitch export: 2026-04-01

## Color Palette (Dark Theme)

| Token | Hex | Usage |
|-------|-----|-------|
| bg | `#0b1326` | Page/map background |
| surface | `#131b2e` | Card background, containers |
| surface-high | `#222a3d` | Elevated containers |
| surface-bright | `#31394d` | Interactive surface hover |
| text | `#dae2fd` | Primary text |
| text-muted | `#b9c7e0` | Secondary text |
| text-subtle | `#94a3b8` | Tertiary text, labels |
| accent | `#f59e0b` | Primary accent, pins, CTAs |
| accent-warm | `#ffc174` | Warm amber, headlines |
| accent-hover | `#d97706` | Hover state |
| accent-soft | `rgba(245, 158, 11, 0.15)` | Subtle accent backgrounds |
| border | `rgba(255,255,255,0.05)` | Subtle borders |
| border-hover | `rgba(255,255,255,0.1)` | Hover borders |

## Typography

| Role | Family | Weight | Style |
|------|--------|--------|-------|
| Headline | Noto Serif | 700 | Bold, italic for emphasis |
| Body | Plus Jakarta Sans | 400-600 | Regular to semibold |
| Label | Plus Jakarta Sans | 500-700 | Medium to bold, uppercase |

## Key Patterns

### Glass Panel
```css
background: rgba(11, 19, 38, 0.4);
backdrop-filter: blur(24px);
border: 1px solid rgba(255,255,255,0.05);
border-radius: 0.75rem;
```

### Amber Glow
```css
box-shadow: 0 0 40px 0 rgba(245, 158, 11, 0.3);
```

### Map Vignette
```css
background: radial-gradient(circle, transparent 20%, #0b1326 100%);
```

## Border Radius
- Default: 0.25rem
- Large: 0.5rem
- XL: 1.5rem
- Full: 9999px (pins, avatars, pills)

## Motion
- Pin drop: bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)
- Panel slide: 0.5s ease-out
- Hover scale: 1.1, 500ms
- Active scale: 0.9
- Glass panel fade: 0.3s ease
