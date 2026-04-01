'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { DiscoveryParams, Restaurant } from '@/lib/types';
import RestaurantCard from '../components/RestaurantCard';

const MapView = dynamic(() => import('../components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-slate-800 rounded-xl animate-pulse" />
  ),
});

interface DiscoverClientProps {
  discovery: DiscoveryParams;
}

export default function DiscoverClient({ discovery }: DiscoverClientProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const pin = {
    lat: parseFloat(discovery.lat),
    lng: parseFloat(discovery.lng),
  };

  // Load restaurants from search
  useEffect(() => {
    async function loadRestaurants() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          cuisine: discovery.cuisine,
          city: discovery.city,
        });
        const res = await fetch(`/api/restaurants?${params}`);
        const data = await res.json();
        setRestaurants(data.restaurants || []);
      } catch {
        setRestaurants([]);
      }
      setLoading(false);
    }

    loadRestaurants();
  }, [discovery]);

  // Share handler
  const handleShare = useCallback(async () => {
    const shareUrl = window.location.href;
    const shareText = `I dropped a pin on ${discovery.locationName} and found ${discovery.cuisine} in NYC`;

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
  }, [discovery]);

  return (
    <main className="discover-page min-h-screen bg-bg">
      {/* Hero section with mini map */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <div className="absolute inset-0">
          <MapView
            onPinDrop={() => {}}
            pin={pin}
            flyToTarget={pin}
            flyToZoom={5}
            disabled
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900" />
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 sm:px-6 -mt-12 relative z-10 pb-12">
        {/* Location pill */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-4 animate-fade-in">
          <span>📍</span>
          <span>{discovery.locationName}</span>
          <span className="text-slate-600">→</span>
          <span className="text-orange-400 font-medium">NYC</span>
        </div>

        {/* Cuisine name */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-accent leading-tight mb-4 animate-fade-in font-headline" style={{ animationDelay: '100ms' }}>
          {discovery.cuisine}
        </h1>

        {/* Cultural blurb */}
        {discovery.culturalBlurb && (
          <div className="bg-surface-high/50 rounded-xl p-4 border border-border mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <p className="text-slate-300 text-sm leading-relaxed italic">
              &ldquo;{discovery.culturalBlurb}&rdquo;
            </p>
          </div>
        )}

        {/* Bridge */}
        <p className="text-xl font-semibold text-white text-center mb-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
          Now, in <span className="text-orange-400">New York City</span>...
        </p>

        {/* Restaurants */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-slate-800/50 rounded-2xl p-4 animate-pulse"
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
        ) : restaurants.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium animate-fade-in" style={{ animationDelay: '400ms' }}>
              {discovery.cuisine} in NYC ({restaurants.length})
            </p>
            {restaurants.map((restaurant, i) => (
              <div
                key={restaurant.id}
                className="animate-slide-up"
                style={{
                  animationDelay: `${450 + i * 120}ms`,
                  animationFillMode: 'both',
                }}
              >
                <RestaurantCard
                  restaurant={restaurant}
                  index={i}
                  pinLocationName={discovery.locationName}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <span className="text-3xl block mb-3">🍁</span>
            <p className="text-slate-300">
              No {discovery.cuisine} restaurants found in NYC yet.
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Try another pin!
            </p>
          </div>
        )}

        {/* Share + CTA */}
        <div className="flex flex-col items-center gap-3 mt-8 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors border border-slate-700/50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share this discovery
          </button>

          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
          >
            🎲 Drop your own pin
          </a>

          {shareToast && (
            <p className="text-emerald-400 text-sm animate-fade-in">
              Link copied to clipboard!
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
