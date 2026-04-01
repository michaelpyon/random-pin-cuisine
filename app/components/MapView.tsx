'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { PinLocation } from '@/lib/types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const INITIAL_CENTER: [number, number] = [20, 15];
const INITIAL_ZOOM = 1.8;

interface MapViewProps {
  onPinDrop: (location: PinLocation) => void;
  pin: PinLocation | null;
  flyToTarget: PinLocation | null;
  flyToZoom?: number;
  disabled?: boolean;
}

export default function MapView({
  onPinDrop,
  pin,
  flyToTarget,
  flyToZoom,
  disabled = false,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      projection: 'globe',
      attributionControl: false,
      maxZoom: 15,
    });

    // Globe atmosphere
    map.on('style.load', () => {
      map.setFog({
        color: 'rgb(15, 23, 42)',
        'high-color': 'rgb(30, 41, 59)',
        'horizon-blend': 0.08,
        'space-color': 'rgb(15, 23, 42)',
        'star-intensity': 0.3,
      });
    });

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle click to drop pin
  const handleMapClick = useCallback(
    (e: mapboxgl.MapMouseEvent) => {
      if (disabled) return;
      const { lat, lng } = e.lngLat;
      onPinDrop({
        lat: Math.round(lat * 1000) / 1000,
        lng: Math.round(lng * 1000) / 1000,
      });
    },
    [onPinDrop, disabled]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [handleMapClick, mapLoaded]);

  // Update cursor based on disabled state
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = disabled ? 'default' : 'crosshair';
  }, [disabled]);

  // Place/update marker when pin changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pin) {
      if (markerRef.current) {
        markerRef.current.setLngLat([pin.lng, pin.lat]);
      } else {
        // Create custom pin element
        const el = document.createElement('div');
        el.className = 'map-pin-marker';
        el.innerHTML = `
          <svg width="36" height="48" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 1C7.268 1 1 7.268 1 15C1 22 8 31 13 38C13.8 39.2 15 41 15 41C15 41 16.2 39.2 17 38C22 31 29 22 29 15C29 7.268 22.732 1 15 1Z" fill="#f97316" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
            <circle cx="15" cy="15" r="6.5" fill="white" opacity="0.9"/>
          </svg>
        `;

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
        })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map);

        markerRef.current = marker;
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [pin]);

  // Fly to target (globe zoom out, or city pan)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;

    map.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: flyToZoom ?? 4,
      duration: 2000,
      essential: true,
    });
  }, [flyToTarget, flyToZoom]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Crosshair overlay when no pin */}
      {!pin && !disabled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-12 h-12 opacity-60">
            <svg
              viewBox="0 0 52 52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="26"
                cy="26"
                r="21"
                stroke="#f97316"
                strokeWidth="2"
                strokeDasharray="5 3.5"
                opacity="0.8"
              />
              <circle cx="26" cy="26" r="6" fill="#f97316" />
              <circle cx="26" cy="26" r="2.5" fill="white" opacity="0.95" />
              <line
                x1="26" y1="4" x2="26" y2="14"
                stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" opacity="0.8"
              />
              <line
                x1="26" y1="38" x2="26" y2="48"
                stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" opacity="0.8"
              />
              <line
                x1="4" y1="26" x2="14" y2="26"
                stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" opacity="0.8"
              />
              <line
                x1="38" y1="26" x2="48" y2="26"
                stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" opacity="0.8"
              />
            </svg>
          </div>
        </div>
      )}

      {/* No token warning */}
      {!MAPBOX_TOKEN && (
        <div className="absolute top-4 left-4 bg-amber-900/90 text-amber-200 px-4 py-2 rounded-lg text-sm z-20">
          Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local to load the map
        </div>
      )}
    </div>
  );
}
