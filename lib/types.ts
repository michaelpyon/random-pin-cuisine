// Shared types for random-pin-cuisine

export interface PinLocation {
  lat: number;
  lng: number;
}

export interface GeocodedLocation extends PinLocation {
  displayName: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
}

export interface CuisineResult {
  cuisineType: string;
  description: string;
  culturalBlurb: string;
  cuisineAdjacent?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  imageUrl?: string;
  rating: number;
  reviewCount: number;
  price?: string;
  categories: string[];
  address: string;
  city: string;
  phone?: string;
  yelpUrl: string;
  menuUrl?: string;
  lat: number;
  lng: number;
  distance?: number; // meters from reference point
}

export interface DiscoveryState {
  pin: PinLocation;
  locationName: string;
  cuisine: CuisineResult;
  restaurants: Restaurant[];
  city: string;
}

// URL-encoded discovery params (no database needed)
export interface DiscoveryParams {
  lat: string;
  lng: string;
  locationName: string;
  cuisine: string;
  culturalBlurb: string;
  restaurantIds?: string; // comma-separated Yelp IDs
  city: string;
}

export type FlowPhase =
  | 'idle'
  | 'pin-dropped'
  | 'globe-zoom'
  | 'classifying'
  | 'cuisine-reveal'
  | 'bridge'
  | 'loading-restaurants'
  | 'restaurants-reveal'
  | 'complete';

export interface CityConfig {
  id: string;
  name: string;
  displayName: string;
  center: PinLocation;
  yelpLocale: string;
}

export const CITIES: Record<string, CityConfig> = {
  nyc: {
    id: 'nyc',
    name: 'New York City',
    displayName: 'New York City',
    center: { lat: 40.758, lng: -73.9855 },
    yelpLocale: 'New York, NY',
  },
};

export const DEFAULT_CITY = 'nyc';

// Times Square reference point for distance calculations
export const NYC_REFERENCE = { lat: 40.758, lng: -73.9855 };
