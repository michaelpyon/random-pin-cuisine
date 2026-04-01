'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { PinLocation } from '@/lib/types';
import { getRandomLandCoords } from '@/lib/geocode';

// Mapbox must be loaded client-side only
const MapView = dynamic(() => import('./components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
      <div className="text-slate-500">Loading map...</div>
    </div>
  ),
});

const DiscoveryFlow = dynamic(() => import('./components/DiscoveryFlow'), {
  ssr: false,
});

export default function HomePage() {
  const [pin, setPin] = useState<PinLocation | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<PinLocation | null>(null);
  const [flyToZoom, setFlyToZoom] = useState<number>(4);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [hasDroppedPin, setHasDroppedPin] = useState(false);

  // Check localStorage for first-visit state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasDroppedPin(localStorage.getItem('rpc-has-dropped') === '1');
    }
  }, []);

  const handlePinDrop = useCallback((location: PinLocation) => {
    setPin(location);
    setIsDiscovering(true);
    if (!hasDroppedPin) {
      setHasDroppedPin(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('rpc-has-dropped', '1');
      }
    }
  }, [hasDroppedPin]);

  const handleGlobeZoom = useCallback((target: PinLocation, zoom: number) => {
    setFlyToTarget(target);
    setFlyToZoom(zoom);
  }, []);

  const handleBridgePan = useCallback((target: PinLocation, zoom: number) => {
    setFlyToTarget(target);
    setFlyToZoom(zoom);
  }, []);

  const handleReset = useCallback(() => {
    setPin(null);
    setIsDiscovering(false);
    setFlyToTarget(null);
    setFlyToZoom(4);
  }, []);

  const handleRandomPin = useCallback(() => {
    const coords = getRandomLandCoords();
    handlePinDrop(coords);
  }, [handlePinDrop]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) {
        handleRandomPin();
      } else if (e.key === 'Escape' && isDiscovering) {
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleRandomPin, handleReset, isDiscovering]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-900">
      {/* Full-screen map */}
      <div className="absolute inset-0 z-0">
        <MapView
          onPinDrop={handlePinDrop}
          pin={pin}
          flyToTarget={flyToTarget}
          flyToZoom={flyToZoom}
          disabled={isDiscovering}
        />
      </div>

      {/* Header overlay */}
      {!isDiscovering && (
        <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                <span className="text-orange-400">Random Pin</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 drop-shadow mt-0.5">
                Drop a pin anywhere. Find that cuisine in NYC.
              </p>
            </div>
          </div>
        </header>
      )}

      {/* Random Pin button */}
      {!isDiscovering && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3">
          {/* First-visit hint */}
          {!hasDroppedPin && (
            <div className="bg-slate-800/90 backdrop-blur-sm text-slate-200 px-4 py-3 rounded-xl text-center text-sm max-w-xs animate-fade-in shadow-xl border border-slate-700/50">
              <p className="font-medium">Click anywhere on the globe</p>
              <p className="text-slate-400 text-xs mt-1">
                or tap Random Pin to start
              </p>
            </div>
          )}

          <button
            onClick={handleRandomPin}
            className="flex items-center gap-2 px-6 py-3.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-lg">🎲</span>
            Random Pin
            <kbd className="hidden sm:inline-block ml-2 px-1.5 py-0.5 bg-orange-600/50 rounded text-xs font-mono">
              R
            </kbd>
          </button>
        </div>
      )}

      {/* Discovery flow panel */}
      {isDiscovering && pin && (
        <div className="absolute inset-x-0 bottom-0 z-30 sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:w-[420px]">
          <DiscoveryFlow
            pin={pin}
            onGlobeZoom={handleGlobeZoom}
            onBridgePan={handleBridgePan}
            onReset={handleReset}
          />
        </div>
      )}
    </main>
  );
}
