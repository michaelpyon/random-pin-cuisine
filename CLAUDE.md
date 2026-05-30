# Random Pin Cuisine

Drop a pin anywhere on a world map. The app reverse-geocodes the location, classifies the regional cuisine from a built-in lookup table, then finds matching NYC restaurants from OpenStreetMap. Humorous edge cases for ocean, Antarctica, and remote regions.

## Tech stack

- React 19, JavaScript, Vite
- Leaflet + react-leaflet for the interactive world map
- Vercel serverless functions for all data calls (no keys in the browser)
- Nominatim (OpenStreetMap) for reverse geocoding
- Overpass API (OpenStreetMap) for NYC restaurant search
- Built-in lookup table for cuisine classification (no LLM call at runtime)
- @vercel/og for dynamic per-result share images

## Local dev

```bash
npm install
npm run dev     # Vite dev server, typically port 5173
```

No API keys are required to run the frontend. The serverless functions in `api/`
call public OpenStreetMap endpoints. Optional server-side environment variables
(see `.env.example`):

- `GOOGLE_MAPS_API_KEY` optional Google Places enrichment for ratings
- `NOMINATIM_USER_AGENT` optional custom User-Agent for Nominatim
- `REDIS_URL` optional durable cache across cold starts (falls back to in-memory)

## Key files

- `src/App.jsx` main orchestrator: map click to geocode to classify to search to display
- `src/components/WorldMap.jsx` Leaflet map with click handler, renders the pin
- `src/components/ResultsPanel.jsx` shows location info and restaurant results
- `src/components/NYCMiniMap.jsx` NYC map pinning found restaurants
- `src/utils/geocode.js` calls the geocode proxy, ocean/Antarctica/Arctic detection
- `src/utils/claude.js` cuisine lookup table (regional overrides by country, then defaults). Named for historical reasons, it does NOT call an LLM.
- `src/utils/yelp.js` calls the restaurant proxy. Named for historical reasons, the backend uses Overpass/OSM, not Yelp.
- `src/utils/shareState.js` encodes and decodes the full reveal in the share URL
- `api/find-restaurants.js` Overpass query with required User-Agent, mirror fallback, retry/backoff
- `api/reverse-geocode.js` Nominatim proxy
- `api/og.js` edge function that renders the per-result share image
- `api/share-meta.js` injects per-result Open Graph meta for crawlers on `?r=` links

## Architecture notes

- Pipeline: map click to reverse geocode to cuisine lookup to Overpass search to display results
- Results are always NYC restaurants regardless of pin location (intentional, you pin the world and eat in NYC)
- Edge cases handled: ocean drops, Antarctica, Arctic, remote regions return humorous messages, kept visually distinct from real technical errors
- Cuisine result cached in a ref so re-searches do not recompute
- All third party calls run server-side in `api/`. No secrets ship in the client bundle.
- Shared links carry the full reveal in a single base64url `r` param so a shared restaurant reopens deterministically without re-running the pipeline

## Deployment

Vercel. The static Vite frontend is served from the build output and the
functions in `api/` run as serverless/edge functions. `vercel.json` rewrites
`?r=` links through `api/share-meta.js` so crawlers get per-result previews.
