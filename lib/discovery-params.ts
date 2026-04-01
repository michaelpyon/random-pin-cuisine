// URL-encoded discovery state: no database needed.
// Share links encode lat, lng, cuisine, restaurant IDs in query params.

import type { DiscoveryState, DiscoveryParams } from './types';

export function encodeDiscovery(state: DiscoveryState): string {
  const params = new URLSearchParams();
  params.set('lat', state.pin.lat.toFixed(4));
  params.set('lng', state.pin.lng.toFixed(4));
  params.set('loc', state.locationName);
  params.set('cuisine', state.cuisine.cuisineType);
  params.set('blurb', state.cuisine.culturalBlurb);
  params.set('city', state.city);

  if (state.restaurants.length > 0) {
    params.set(
      'rids',
      state.restaurants
        .slice(0, 5)
        .map((r) => r.id)
        .join(',')
    );
  }

  return `/discover?${params.toString()}`;
}

export function decodeDiscovery(
  searchParams: Record<string, string | string[] | undefined>
): DiscoveryParams | null {
  const lat = typeof searchParams.lat === 'string' ? searchParams.lat : undefined;
  const lng = typeof searchParams.lng === 'string' ? searchParams.lng : undefined;
  const locationName = typeof searchParams.loc === 'string' ? searchParams.loc : undefined;
  const cuisine = typeof searchParams.cuisine === 'string' ? searchParams.cuisine : undefined;
  const culturalBlurb = typeof searchParams.blurb === 'string' ? searchParams.blurb : undefined;
  const city = typeof searchParams.city === 'string' ? searchParams.city : 'nyc';
  const restaurantIds = typeof searchParams.rids === 'string' ? searchParams.rids : undefined;

  if (!lat || !lng || !cuisine) return null;

  return {
    lat,
    lng,
    locationName: locationName || 'Unknown location',
    cuisine,
    culturalBlurb: culturalBlurb || '',
    restaurantIds,
    city,
  };
}

export function buildShareUrl(base: string, state: DiscoveryState): string {
  return `${base}${encodeDiscovery(state)}`;
}
