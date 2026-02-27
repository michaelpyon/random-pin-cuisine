# Sprint 4 Plan — Random Pin Cuisine

## Current State Assessment

**Strengths:**
- Solid architecture: clean component separation, decoupled mini-map, local cuisine DB with 80+ countries
- Good UX flow: pin → geocode → cuisine → OSM search → Google Places enrichment
- Dark theme is cohesive, Space Grotesk font works well
- Pin history, favorites, share link, keyboard shortcuts all functional
- Background enrichment with progressive loading is smart

**Issues Found:**

| # | Issue | Severity |
|---|-------|----------|
| 1 | Restaurant cards lack visual hierarchy — name, rating, badges, distance all compete for attention | High |
| 2 | No skeleton/shimmer loading state — spinner alone feels slow, especially during enrichment | High |
| 3 | Mobile bottom sheet needs better affordances — drag handle is too subtle, padding inconsistent | High |
| 4 | No meta/OG tags — not deploy-ready for sharing | High |
| 5 | First-visit empty state is underwhelming — just a map with a subtle hint | Medium |
| 6 | Google API key hardcoded in HTML (security — should use env var) | Medium |
| 7 | No error boundary — unhandled React errors crash silently | Medium |
| 8 | `isOcean` check is brittle — network errors return null which triggers ocean message | Medium |
| 9 | Restaurant card animation re-triggers on filter change (no memoization) | Low |
| 10 | Cuisine description section could show signature dishes as chips | Low |
| 11 | No favicon beyond emoji — needs proper PWA-ready icon | Low |

---

## Sprint 4 Tasks (Ranked by Impact)

### Task 1: Restaurant Card Visual Hierarchy Redesign
**Files:** `src/App.css`
**Changes:**
- Restructure card layout: name + fav on top row, rating row below (stars + value + reviews + price), cuisine chips as styled pills, meta section tighter
- Add subtle gradient on featured/top-pick cards
- Increase tap target for favorite button on mobile
- Better spacing between card sections
**Validation:** Cards readable at 375px, clear visual scan order: name → rating → cuisine → location → links

### Task 2: Skeleton Loading State
**Files:** `src/components/ResultsPanel.jsx`, `src/App.css`
**Changes:**
- Add SkeletonCard component with shimmer animation (3 placeholder cards)
- Show skeleton cards below the spinner during loading
- Show skeleton cards during enrichment phase (when `enriching` is true but cards exist, overlay subtle shimmer on rating area)
**Validation:** Skeleton appears immediately on pin drop, disappears when results render

### Task 3: Mobile Bottom Sheet Polish
**Files:** `src/App.css`
**Changes:**
- Larger drag handle (48px wide, more visible)
- Better top padding for panel content
- Ensure close button doesn't overlap drag handle
- Add safe-area-inset-bottom padding for notched phones
- Smoother slide-up animation
**Validation:** Panel looks native on iOS Safari 375px, no content overlap

### Task 4: Deploy-Ready Meta Tags + OG
**Files:** `index.html`
**Changes:**
- Add meta description, theme-color, og:title, og:description, og:type
- Add apple-mobile-web-app meta tags
- Move Google API key to env var pattern (Vite VITE_ prefix)
**Validation:** Link preview shows title + description when shared; API key not in source

### Task 5: First-Visit Empty State Enhancement  
**Files:** `src/App.jsx`, `src/App.css`
**Changes:**
- Replace subtle map hint with a more visible centered card on mobile showing "Drop a pin anywhere in the world" with arrow pointing to Random Pin button
- Add subtle pulsing animation on Random Pin button when no pin has been dropped
- Hide enhanced hint after first pin drop (localStorage flag)
**Validation:** New user on mobile immediately understands what to do

### Task 6: Robust Ocean/Error Detection
**Files:** `src/utils/geocode.js`, `src/App.jsx`
**Changes:**
- Distinguish between network error and actual ocean (geocode returning null)
- Show "Connection error" vs "Ocean" messages appropriately
**Validation:** Airplane mode shows connection error, not ocean message

### Task 7: Error Boundary Component
**Files:** `src/components/ErrorBoundary.jsx` (new), `src/App.jsx`
**Changes:**
- Create React error boundary with styled fallback UI
- Wrap App content in ErrorBoundary
**Validation:** Deliberately throw in a component, see fallback UI instead of white screen

### Task 8: Cuisine Signature Dishes as Chips
**Files:** `src/utils/claude.js`, `src/components/ResultsPanel.jsx`, `src/App.css`
**Changes:**
- Add `signatureDishes` array (3-4 items) to each cuisine entry
- Display as small styled chips below cuisine description
**Validation:** Chips visible, don't overflow on 375px

### Task 9: Google API Key Environment Variable
**Files:** `index.html`, `vite.config.js`, `.env.example`
**Changes:**
- Use Vite html env substitution or conditional script injection
- Create .env.example with placeholder
**Validation:** `npm run build` works with .env set; key not in committed source

### Task 10: Performance — Memoize Restaurant Cards
**Files:** `src/components/ResultsPanel.jsx`
**Changes:**
- Wrap RestaurantCard in React.memo with custom comparator
- Stable keys using OSM ID instead of name+index
**Validation:** Filter toggle doesn't re-animate already-visible cards

---

## Execution Plan
Execute Tasks 1-5 (highest impact). Tasks 6-10 are Sprint 4.5 backlog.
