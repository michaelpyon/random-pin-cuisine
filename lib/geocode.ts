import type { GeocodedLocation, PinLocation } from './types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

export function isAntarctica(lat: number): boolean {
  return lat < -60;
}

export function isArctic(lat: number): boolean {
  return lat > 75;
}

export function isOcean(geocodeResult: GeocodedLocation | null): boolean {
  return geocodeResult === null || !geocodeResult.country;
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodedLocation | null> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: 'json',
    zoom: '10',
    addressdetails: '1',
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      'User-Agent': 'RandomPinCuisine/2.0 (https://random-pin.michaelpyon.com)',
    },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Geocoding failed: ${res.status}`);
  }

  const data = await res.json();

  if (data.error) return null;

  const address = data.address || {};
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county;
  const state = address.state;
  const country = address.country;
  const countryCode = address.country_code;

  if (!country) return null;

  const parts = [city, state, country].filter(Boolean);
  const displayName = parts.join(', ') || data.display_name || 'Unknown location';

  return {
    lat,
    lng,
    displayName,
    city,
    state,
    country,
    countryCode,
  };
}

// Curated random land coords (carried over from v1)
const LAND_CITIES: PinLocation[] = [
  { lat: 35.6762, lng: 139.6503 },  // Tokyo
  { lat: 48.8566, lng: 2.3522 },    // Paris
  { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
  { lat: 13.7563, lng: 100.5018 },  // Bangkok
  { lat: 41.9028, lng: 12.4964 },   // Rome
  { lat: 35.0116, lng: 135.7681 },  // Kyoto
  { lat: 19.4326, lng: -99.1332 },  // Mexico City
  { lat: 28.6139, lng: 77.209 },    // New Delhi
  { lat: -1.2921, lng: 36.8219 },   // Nairobi
  { lat: 37.5665, lng: 126.978 },   // Seoul
  { lat: 31.2304, lng: 121.4737 },  // Shanghai
  { lat: 41.0082, lng: 28.9784 },   // Istanbul
  { lat: 55.7558, lng: 37.6176 },   // Moscow
  { lat: -22.9068, lng: -43.1729 }, // Rio
  { lat: 30.0444, lng: 31.2357 },   // Cairo
  { lat: 1.3521, lng: 103.8198 },   // Singapore
  { lat: 52.52, lng: 13.405 },      // Berlin
  { lat: -33.8688, lng: 151.2093 }, // Sydney
  { lat: 14.5995, lng: 120.9842 },  // Manila
  { lat: 23.1291, lng: 113.2644 },  // Guangzhou
  { lat: 50.0755, lng: 14.4378 },   // Prague
  { lat: 47.4979, lng: 19.0402 },   // Budapest
  { lat: 4.711, lng: -74.0721 },    // Bogota
  { lat: -12.0464, lng: -77.0428 }, // Lima
  { lat: 21.0285, lng: 105.8542 },  // Hanoi
  { lat: 33.8938, lng: 35.5018 },   // Beirut
  { lat: 6.5244, lng: 3.3792 },     // Lagos
  { lat: 9.032, lng: 38.7468 },     // Addis Ababa
  { lat: 29.9511, lng: -90.0715 },  // New Orleans
  { lat: 36.1627, lng: -86.7816 },  // Nashville
  { lat: 47.9077, lng: 106.8832 },  // Ulaanbaatar
  { lat: -6.2088, lng: 106.8456 },  // Jakarta
  { lat: 42.6977, lng: 23.3219 },   // Sofia
  { lat: 25.2048, lng: 55.2708 },   // Dubai
  { lat: 18.4655, lng: -66.1057 },  // San Juan
];

export function getRandomLandCoords(): PinLocation {
  const city = LAND_CITIES[Math.floor(Math.random() * LAND_CITIES.length)];
  const latOffset = (Math.random() - 0.5) * 0.6;
  const lngOffset = (Math.random() - 0.5) * 0.6;
  return {
    lat: Math.round((city.lat + latOffset) * 1000) / 1000,
    lng: Math.round((city.lng + lngOffset) * 1000) / 1000,
  };
}
