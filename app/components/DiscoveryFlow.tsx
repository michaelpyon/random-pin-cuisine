'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  PinLocation,
  GeocodedLocation,
  CuisineResult,
  Restaurant,
  FlowPhase,
  DiscoveryState,
} from '@/lib/types';
import { CITIES, DEFAULT_CITY } from '@/lib/types';
import {
  reverseGeocode,
  isAntarctica,
  isArctic,
  isOcean,
} from '@/lib/geocode';
import { encodeDiscovery } from '@/lib/discovery-params';
import RestaurantCard from './RestaurantCard';

interface DiscoveryFlowProps {
  pin: PinLocation;
  onGlobeZoom: (target: PinLocation, zoom: number) => void;
  onBridgePan: (target: PinLocation, zoom: number) => void;
  onReset: () => void;
}

const LOADING_MESSAGES = [
  'Consulting the bodega cats...',
  'Asking a well-traveled cab driver...',
  'Checking with the subway pigeons...',
  'Decoding local cuisine signals...',
  'Waking up a sleeping sommelier...',
  'Scouring NYC for a match...',
];

function useTypingAnimation(text: string, speed: number = 40): string {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
    indexRef.current = 0;

    if (!text) return;

    const timer = setInterval(() => {
      indexRef.current++;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return displayed;
}

// Fetch with single auto-retry for network errors
async function fetchWithRetry(
  url: string,
  opts: RequestInit = {},
  setNetworkToast: (v: string | null) => void
): Promise<Response> {
  try {
    return await fetch(url, opts);
  } catch (err) {
    if ((opts.signal as AbortSignal)?.aborted) throw err;
    // First failure: show toast and retry once
    setNetworkToast('Connection lost, retrying...');
    await new Promise((r) => setTimeout(r, 1500));
    setNetworkToast(null);
    return fetch(url, opts); // second attempt, let it throw if it fails
  }
}

export default function DiscoveryFlow({
  pin,
  onGlobeZoom,
  onBridgePan,
  onReset,
}: DiscoveryFlowProps) {
  const [phase, setPhase] = useState<FlowPhase>('pin-dropped');
  const [location, setLocation] = useState<GeocodedLocation | null>(null);
  const [cuisine, setCuisine] = useState<CuisineResult | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [shareToast, setShareToast] = useState(false);
  const [networkToast, setNetworkToast] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Rotate loading messages
  useEffect(() => {
    if (phase !== 'classifying' && phase !== 'loading-restaurants') return;
    const timer = setInterval(() => {
      setLoadingMsg((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [phase]);

  // Typing animation for cuisine name
  const cuisineTyped = useTypingAnimation(
    phase === 'cuisine-reveal' || phase === 'bridge' || phase === 'loading-restaurants' || phase === 'restaurants-reveal' || phase === 'complete'
      ? cuisine?.cuisineType || ''
      : '',
    50
  );

  // Main discovery pipeline
  const runDiscovery = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setNetworkToast(null);
    setPhase('pin-dropped');

    // Phase 1: Globe zoom-out (purely visual, 1s)
    await new Promise((r) => setTimeout(r, 300));
    if (controller.signal.aborted) return;
    setPhase('globe-zoom');
    onGlobeZoom(pin, 3);
    await new Promise((r) => setTimeout(r, 1500));
    if (controller.signal.aborted) return;

    // Edge case checks
    if (isAntarctica(pin.lat)) {
      setError(
        "Brr! Antarctica's cuisine is mostly freeze-dried rations and penguin-adjacent sadness. Try somewhere warmer!"
      );
      return;
    }
    if (isArctic(pin.lat)) {
      setError(
        "You found the North Pole! Santa's kitchen is invite-only. Try somewhere more accessible!"
      );
      return;
    }

    // Phase 2: Geocode + classify
    setPhase('classifying');

    let geocoded: GeocodedLocation | null = null;
    try {
      geocoded = await reverseGeocode(pin.lat, pin.lng);
    } catch {
      setError('Could not identify this location. Try another pin!');
      return;
    }

    if (controller.signal.aborted) return;

    if (isOcean(geocoded)) {
      setError(
        "You dropped a pin in the ocean! Fish don't have restaurants... yet. Try again on land!"
      );
      return;
    }

    setLocation(geocoded);

    // Classify cuisine via API (with auto-retry)
    let cuisineResult: CuisineResult;
    try {
      const params = new URLSearchParams({
        lat: pin.lat.toString(),
        lng: pin.lng.toString(),
        location: geocoded!.displayName,
      });
      const res = await fetchWithRetry(
        `/api/classify?${params}`,
        { signal: controller.signal },
        setNetworkToast
      );
      cuisineResult = await res.json();
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        `Explore the cuisine of ${geocoded!.displayName}. Classification timed out, but the world is still delicious.`
      );
      return;
    }

    if (controller.signal.aborted) return;
    setCuisine(cuisineResult);

    // Phase 3: Cuisine reveal (typing animation)
    setPhase('cuisine-reveal');
    await new Promise((r) => setTimeout(r, 2000));
    if (controller.signal.aborted) return;

    // Phase 4: Bridge animation ("Now, in New York City...")
    setPhase('bridge');
    const cityConfig = CITIES[DEFAULT_CITY];
    onBridgePan(cityConfig.center, 12);
    await new Promise((r) => setTimeout(r, 2500));
    if (controller.signal.aborted) return;

    // Phase 5: Fetch restaurants (with auto-retry)
    setPhase('loading-restaurants');
    try {
      const params = new URLSearchParams({
        cuisine: cuisineResult.cuisineType,
        city: DEFAULT_CITY,
      });
      if (cuisineResult.cuisineAdjacent) {
        params.set('adjacent', cuisineResult.cuisineAdjacent);
      }
      const res = await fetchWithRetry(
        `/api/restaurants?${params}`,
        { signal: controller.signal },
        setNetworkToast
      );
      const data = await res.json();
      if (controller.signal.aborted) return;
      setRestaurants(data.restaurants || []);
    } catch (err) {
      if (controller.signal.aborted) return;
      setRestaurants([]);
    }

    // Phase 6: Reveal restaurants
    setPhase('restaurants-reveal');
    await new Promise((r) => setTimeout(r, 500));
    if (controller.signal.aborted) return;
    setPhase('complete');
  }, [pin, onGlobeZoom, onBridgePan]);

  // Start discovery when pin changes
  useEffect(() => {
    runDiscovery();
    return () => {
      abortRef.current?.abort();
    };
  }, [runDiscovery]);

  // Build share URL
  const handleShare = useCallback(async () => {
    if (!cuisine || !location) return;

    const discoveryState: DiscoveryState = {
      pin,
      locationName: location.displayName,
      cuisine,
      restaurants,
      city: DEFAULT_CITY,
    };

    const path = encodeDiscovery(discoveryState);
    const shareUrl = `${window.location.origin}${path}`;

    const shareText = `I dropped a pin on ${location.displayName} and found ${cuisine.cuisineType} in NYC`;

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Random Pin Cuisine',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or API failed, fall through
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    } catch {
      // Final fallback: open Twitter intent
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        shareText
      )}&url=${encodeURIComponent(shareUrl)}`;
      window.open(tweetUrl, '_blank', 'noopener,noreferrer');
    }
  }, [pin, location, cuisine, restaurants]);

  // Error state
  if (error) {
    const errorEmoji = error.includes('ocean')
      ? '🌊'
      : error.includes('Antarctica')
        ? '🧊'
        : error.includes('North Pole')
          ? '🎅'
          : error.includes('timed out')
            ? '🕐'
            : '⚠️';

    return (
      <div className="discovery-panel">
        <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-4">
          <span className="text-4xl">{errorEmoji}</span>
          <p className="text-lg text-slate-200 max-w-md">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            {error.includes('timed out') && (
              <button
                onClick={runDiscovery}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
              >
                Retry
              </button>
            )}
            <button
              onClick={onReset}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
            >
              Drop another pin
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="discovery-panel">
      {/* Network toast */}
      {networkToast && (
        <div className="absolute top-4 left-4 right-12 z-20 animate-fade-in">
          <div className="bg-amber-900/90 backdrop-blur-sm text-amber-200 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 shadow-lg">
            <div className="w-4 h-4 border-2 border-amber-400/50 border-t-amber-400 rounded-full animate-spin flex-shrink-0" />
            {networkToast}
          </div>
        </div>
      )}
      {/* Close / Reset button */}
      <button
        onClick={onReset}
        className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-lg"
        aria-label="Close"
      >
        &times;
      </button>

      {/* Phase: Pin dropped / Globe zoom */}
      {(phase === 'pin-dropped' || phase === 'globe-zoom') && (
        <div className="flex flex-col items-center justify-center py-12 gap-4 animate-fade-in">
          <div className="w-3 h-3 rounded-full bg-orange-500 animate-ping" />
          <p className="text-slate-400 text-sm">Dropping pin...</p>
        </div>
      )}

      {/* Phase: Classifying */}
      {phase === 'classifying' && (
        <div className="flex flex-col items-center justify-center py-12 gap-4 animate-fade-in">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-2 border-orange-500/30 rounded-full animate-spin" style={{ borderTopColor: '#f97316' }} />
            <span className="absolute inset-0 flex items-center justify-center text-2xl">🍽️</span>
          </div>
          <p className="text-slate-300 text-sm animate-pulse" key={loadingMsg}>
            {LOADING_MESSAGES[loadingMsg]}
          </p>
          {location && (
            <p className="text-slate-500 text-xs">
              📍 {location.displayName}
            </p>
          )}
        </div>
      )}

      {/* Phase: Cuisine reveal */}
      {(phase === 'cuisine-reveal' ||
        phase === 'bridge' ||
        phase === 'loading-restaurants' ||
        phase === 'restaurants-reveal' ||
        phase === 'complete') &&
        cuisine && (
          <div className="px-5 sm:px-6 py-6 space-y-6">
            {/* Location */}
            {location && (
              <div className="animate-fade-in">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">
                  Pin dropped near
                </p>
                <p className="text-slate-200 font-medium">
                  {location.displayName}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {pin.lat.toFixed(3)}, {pin.lng.toFixed(3)}
                </p>
              </div>
            )}

            {/* Cuisine name with typing animation */}
            <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">
                Local cuisine
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-orange-400 leading-tight">
                {cuisineTyped}
                {cuisineTyped.length < (cuisine.cuisineType?.length || 0) && (
                  <span className="inline-block w-0.5 h-8 bg-orange-400 ml-0.5 animate-blink" />
                )}
              </h2>
              <p className="mt-3 text-slate-300 text-sm leading-relaxed">
                {cuisine.description}
              </p>
            </div>

            {/* Cultural blurb */}
            {cuisine.culturalBlurb && (
              <div
                className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 animate-fade-in"
                style={{ animationDelay: '600ms' }}
              >
                <p className="text-slate-300 text-sm leading-relaxed italic">
                  &ldquo;{cuisine.culturalBlurb}&rdquo;
                </p>
              </div>
            )}

            {/* Bridge: "Now, in New York City..." */}
            {(phase === 'bridge' ||
              phase === 'loading-restaurants' ||
              phase === 'restaurants-reveal' ||
              phase === 'complete') && (
              <div
                className="text-center py-4 animate-fade-in"
                style={{ animationDelay: '200ms' }}
              >
                <p className="text-xl sm:text-2xl font-semibold text-white">
                  Now, in{' '}
                  <span className="text-orange-400">New York City</span>...
                </p>
              </div>
            )}

            {/* Loading restaurants */}
            {phase === 'loading-restaurants' && (
              <div className="space-y-3 animate-fade-in">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-800/50 rounded-2xl p-4 animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-xl bg-slate-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-700 rounded w-3/4" />
                        <div className="h-3 bg-slate-700 rounded w-1/2" />
                        <div className="h-3 bg-slate-700 rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Restaurant cards */}
            {(phase === 'restaurants-reveal' || phase === 'complete') && (
              <div className="space-y-3">
                {restaurants.length > 0 ? (
                  <>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                      {cuisine.cuisineType} in NYC ({restaurants.length})
                    </p>
                    {restaurants.map((restaurant, i) => (
                      <div
                        key={restaurant.id}
                        className="animate-slide-up"
                        style={{
                          animationDelay: `${i * 120}ms`,
                          animationFillMode: 'both',
                        }}
                      >
                        <RestaurantCard
                          restaurant={restaurant}
                          index={i}
                          pinLocationName={location?.displayName}
                        />
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <span className="text-3xl block mb-3">🍁</span>
                    <p className="text-slate-300">
                      No {cuisine.cuisineType} restaurants found in NYC yet.
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                      Try another pin!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Share prompt */}
            {phase === 'complete' && (
              <div
                className="flex flex-col items-center gap-3 pt-4 pb-2 animate-fade-in"
                style={{ animationDelay: '400ms' }}
              >
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share this discovery
                </button>

                <button
                  onClick={onReset}
                  className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
                >
                  Drop another pin
                </button>

                {shareToast && (
                  <p className="text-emerald-400 text-sm animate-fade-in">
                    Link copied to clipboard!
                  </p>
                )}
              </div>
            )}
          </div>
        )}
    </div>
  );
}
