# Random Pin Cuisine

Drop a pin anywhere on a world map → the app reverse-geocodes the location, uses Claude AI to classify the regional cuisine, then searches Yelp for matching NYC restaurants. Humorous edge cases for ocean, Antarctica, and remote regions.

## Tech stack

- React 19, JavaScript, Vite
- Leaflet + react-leaflet — interactive world map
- Claude API — cuisine classification from location name
- Yelp Fusion API — NYC restaurant search
- No backend — all API calls made directly from the browser

## Local dev

```bash
npm install
npm run dev     # Vite dev server, typically port 5173
```

Requires environment variables (create `.env`):
```
VITE_CLAUDE_API_KEY=...
VITE_YELP_API_KEY=...
```

**Note:** Calling Claude and Yelp directly from the browser requires CORS-permissive endpoints or a proxy. Check `src/utils/claude.ts` and `src/utils/yelp.ts` for current approach.

## Key files

- `src/App.jsx` — main orchestrator: map click → geocode → classify → search → display
- `src/components/WorldMap.jsx` — Leaflet map with click handler, renders pin
- `src/components/ResultsPanel.jsx` — shows location info + restaurant results
- `src/components/NYCMiniMap.jsx` — NYC map pinning found restaurants
- `src/utils/geocode.ts` — reverse geocoding, ocean/Antarctica/Arctic detection
- `src/utils/claude.ts` — calls Claude API to classify cuisine from location string
- `src/utils/yelp.ts` — Yelp Fusion API search for NYC restaurants by cuisine type

## Architecture notes

- Pipeline: map click → reverse geocode → Claude cuisine classification → Yelp search → display results
- Results are always NYC restaurants regardless of pin location (intentional — you pin the world, eat in NYC)
- Edge cases handled: ocean drops, Antarctica, Arctic, remote regions all return humorous hardcoded messages
- Cuisine result cached in a ref so re-searches don't re-call Claude
- Pure frontend — no server, no database

## Deployment status

Static Vite build. Can deploy to Vercel, Netlify, GitHub Pages. No deployment config exists yet.

**Caution:** API keys are in the frontend bundle — fine for a personal/demo app, not for production at scale.
