# Random Pin Cuisine, audience pass

## The evangelist

Maya, an adventurous NYC diner in her late 20s who treats eating as exploration and posts
in r/FoodNYC and r/AskNYC. Today she finds restaurants through Beli, TikTok food maps, and
"best [cuisine] in NYC" Reddit threads. What makes her screenshot Random Pin Cuisine is the
serendipity loop: she rolls the globe, lands on Oaxaca or Hanoi, and the app names the exact
regional cuisine plus a real NYC spot she can go to tonight, with a share image that reads
"Pin in Oaxaca to a Oaxacan spot in NYC." That is a tweet, not a search result. She bounces
in 5 seconds if the first roll shows a red error badge, a blank map, or a generic cuisine
type with no actual restaurant, because the whole promise is "this exact place, near me."
The single thing that wins or loses her is whether the reveal renders instantly and points
at a real, openable restaurant.

## Ground-truth findings (repo HEAD)

Verified against HEAD source, not assumptions.

- Works end to end in the repo. Pipeline is map click to `api/reverse-geocode.js`
  (Nominatim, sends a User-Agent) to `src/utils/claude.js` cuisine lookup to
  `api/find-restaurants.js` (Overpass) to `ResultsPanel`. Edge cases for ocean and
  Antarctica handled in `src/utils/geocode.js`.
- Data is REAL, not fabricated. Restaurants come from live Overpass/OpenStreetMap
  queries. Cuisine descriptions in `claude.js` are editorial copy about real regional
  cuisines, not invented claims about specific restaurants. No pseudo-random score
  generators, no example.com links, no fake "updated daily" dates.
- No exposed secrets. `src/utils/yelp.js` calls `/api/find-restaurants`; all third party
  calls are server-side. Grep of `src/` and `dist/` found no `VITE_` keys, no `sk-ant`,
  no Yelp key in the bundle.
- Misleading names, now documented. `claude.js` does NOT call Claude (it is a static
  lookup table, the file comment says so). `yelp.js` does NOT call Yelp (the backend uses
  Overpass). These are historical filenames; renaming would touch imports and is deferred.
- FIXED THIS PASS: stale, false docs. The old `CLAUDE.md` claimed Claude AI classification,
  Yelp Fusion search, browser-direct API calls, and "API keys are in the frontend bundle."
  All four were false versus HEAD. The old `README.md` was the untouched default Vite
  template. Both rewritten to match reality. This was the prior pass's flagged cosmetic
  cleanup and the highest-leverage honest-integrity fix available.

### Live vs repo (DEPLOY NEEDED, not a re-fix)

- Live `https://random-pin-cuisine.vercel.app/api/find-restaurants` still returns HTTP 502.
  This is the OLD pre-fix Overpass 406 behavior. HEAD already contains the fix
  (`OVERPASS_USER_AGENT` plus mirror fallback, commit 9efaf94), plus iter2 auto-pin and
  iter3 shareable reveals and `/api/og`. None of it is live yet.
- ACTION: deploy HEAD. Until then the live app is bricked at the reveal step (the whole
  product) while the repo is healthy. This is the single biggest gap and it is a deploy,
  not a code change.

## Prioritized plan

### Quick wins

1. DEPLOY HEAD. Effort S. Deploy needed: yes. Unblocks everything. The repo is fixed and
   the live site is broken; one deploy turns a 502 into a working, shareable product.
2. Honest docs cleanup. Effort S. Deploy needed: no. DONE this pass (CLAUDE.md, README.md).
   Removes false claims about Claude, Yelp, and exposed keys.
3. Rename `claude.js` to `cuisineLookup.js` and `yelp.js` to `restaurants.js` with updated
   imports. Effort S. Deploy needed: no. Removes the last confusing artifact; purely
   mechanical but touches several import sites, so it was left for a focused diff.

### Bigger bets

4. First-roll guaranteed-delight QA. Effort M. Deploy needed: yes (post deploy). Confirm the
   iter2 auto-pin always yields a populated reveal on load across the 12 seed regions, since
   Maya bounces on a blank or error first paint. Add a client retry to a different seed if
   the first Overpass call returns zero results.
   Why: the first 5 seconds are the entire conversion for the evangelist.
5. Distinct empty-result state. Effort S to M. Deploy needed: no. When a real cuisine has
   zero NYC matches within radius, show a "no spot found yet, roll again or search nearby"
   state that is visually separate from both whimsy edge cases and red technical errors.
   Why: avoids a real outage reading as an intended joke.
6. Surface the share affordance earlier. Effort M. Deploy needed: yes. The shareable reveal
   and `/api/og` exist but only matter if Maya notices the share button at the moment of
   delight. Make share a primary action on the reveal card, not a secondary control.
   Why: the screenshot/share loop is the growth engine.
7. Add a lightweight "open in Google Maps / directions" link per restaurant. Effort S.
   Deploy needed: no for code. Maya wants to actually go tonight; OSM gives lat/lng, so a
   directions deep link converts curiosity into a visit and a reason to return.
8. Tighten coastal geocoding. Effort M. Deploy needed: yes. Coastal clicks can resolve to
   "ocean"; bias reverse-geocode to the nearest land feature so a click on a coastal city
   does not get the fish joke.
   Why: removes a frustrating false negative on otherwise valid pins.

## Guardrail notes

- No fabricated data added. Data remains real Overpass/Nominatim.
- This pass shipped only the additive, non-deploy doc cleanup. The live 502 is flagged for
  deploy, not re-fixed, since HEAD already contains the fix.
