# Random Pin Cuisine

Drop a pin anywhere on a world map and find that region's cuisine in New York City.
The app reverse-geocodes your pin, classifies the regional cuisine, and surfaces
real NYC restaurants serving it from OpenStreetMap. Ocean, Antarctica, and remote
pins get their own playful responses.

Live: https://random-pin-cuisine.vercel.app

## How it works

1. You drop a pin (or roll the globe for a random one).
2. The pin is reverse-geocoded via Nominatim (OpenStreetMap).
3. The region is matched to a cuisine using a built-in lookup table.
4. Matching NYC restaurants are pulled from the Overpass API (OpenStreetMap).
5. The reveal is shareable: a link reopens the exact same restaurant with its own preview image.

All third party calls run in Vercel serverless functions under `api/`. No API
keys ship in the browser bundle.

## Tech stack

- React 19 and Vite
- Leaflet and react-leaflet for the world map
- Vercel serverless and edge functions for geocoding, restaurant search, and share images
- Nominatim and Overpass (OpenStreetMap) for location and restaurant data
- @vercel/og for dynamic per-result Open Graph images

## Local development

```bash
npm install
npm run dev      # Vite dev server, typically http://localhost:5173
npm run build    # production build
npm run preview  # preview the production build
```

No keys are needed to run the frontend. Optional server-side variables for the
functions are documented in `.env.example` (`GOOGLE_MAPS_API_KEY`,
`NOMINATIM_USER_AGENT`, `REDIS_URL`); all are optional.

## Project layout

- `src/` React app: `App.jsx`, `components/`, `utils/`
- `api/` Vercel functions: `find-restaurants.js`, `reverse-geocode.js`, `og.js`, `share-meta.js`
- `vercel.json` rewrites `?r=` share links through `share-meta.js` for crawler previews

See `CLAUDE.md` for a deeper architecture walkthrough.
