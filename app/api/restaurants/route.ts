import { NextRequest, NextResponse } from 'next/server';
import type { Restaurant } from '@/lib/types';
import { CITIES, DEFAULT_CITY, NYC_REFERENCE } from '@/lib/types';

const YELP_API_KEY = process.env.YELP_API_KEY;
const YELP_BASE = 'https://api.yelp.com/v3';

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatRestaurant(biz: Record<string, unknown>): Restaurant {
  const coords = (biz.coordinates as Record<string, number>) || {};
  const location = (biz.location as Record<string, unknown>) || {};
  const categories = (biz.categories as Array<Record<string, string>>) || [];

  const lat = coords.latitude || 0;
  const lng = coords.longitude || 0;
  const distance = haversineMeters(NYC_REFERENCE.lat, NYC_REFERENCE.lng, lat, lng);

  return {
    id: biz.id as string,
    name: biz.name as string,
    imageUrl: (biz.image_url as string) || undefined,
    rating: (biz.rating as number) || 0,
    reviewCount: (biz.review_count as number) || 0,
    price: (biz.price as string) || undefined,
    categories: categories.map((c) => c.title),
    address: [
      (location.address1 as string) || '',
      (location.city as string) || '',
    ]
      .filter(Boolean)
      .join(', '),
    city: (location.city as string) || 'New York',
    phone: (biz.display_phone as string) || undefined,
    yelpUrl: biz.url as string,
    menuUrl: undefined, // Yelp API doesn't expose menu URLs directly
    lat,
    lng,
    distance: Math.round(distance),
  };
}

async function searchYelp(
  cuisine: string,
  cityId: string,
  cuisineAdjacent?: string
): Promise<Restaurant[]> {
  if (!YELP_API_KEY) {
    return getMockRestaurants(cuisine);
  }

  const city = CITIES[cityId] || CITIES[DEFAULT_CITY];

  // Try exact cuisine term first
  const params = new URLSearchParams({
    term: cuisine,
    location: city.yelpLocale,
    limit: '8',
    sort_by: 'best_match',
    radius: '8000',
  });

  let response = await fetch(`${YELP_BASE}/businesses/search?${params}`, {
    headers: { Authorization: `Bearer ${YELP_API_KEY}` },
  });

  if (!response.ok) {
    console.error('Yelp API error:', response.status, await response.text());
    return getMockRestaurants(cuisine);
  }

  let data = await response.json();
  let businesses = (data.businesses || []) as Array<Record<string, unknown>>;

  // If 0 results and we have an adjacent cuisine, try that
  if (businesses.length === 0 && cuisineAdjacent) {
    const fallbackParams = new URLSearchParams({
      term: cuisineAdjacent,
      location: city.yelpLocale,
      limit: '8',
      sort_by: 'best_match',
      radius: '8000',
    });

    response = await fetch(`${YELP_BASE}/businesses/search?${fallbackParams}`, {
      headers: { Authorization: `Bearer ${YELP_API_KEY}` },
    });

    if (response.ok) {
      data = await response.json();
      businesses = (data.businesses || []) as Array<Record<string, unknown>>;
    }
  }

  return businesses.map(formatRestaurant);
}

function getMockRestaurants(cuisine: string): Restaurant[] {
  // Mock data for development without Yelp API key
  const mockBases = [
    {
      name: `${cuisine} Kitchen`,
      rating: 4.5,
      reviewCount: 342,
      price: '$$',
      address: '127 E 7th St, New York',
      lat: 40.7264,
      lng: -73.984,
    },
    {
      name: `The ${cuisine} Table`,
      rating: 4.2,
      reviewCount: 189,
      price: '$$$',
      address: '45 W 25th St, New York',
      lat: 40.7438,
      lng: -73.9904,
    },
    {
      name: `${cuisine} House`,
      rating: 4.7,
      reviewCount: 521,
      price: '$$',
      address: '88 Mott St, New York',
      lat: 40.7175,
      lng: -73.9984,
    },
    {
      name: `Little ${cuisine}`,
      rating: 4.0,
      reviewCount: 156,
      price: '$',
      address: '203 1st Ave, New York',
      lat: 40.7318,
      lng: -73.9847,
    },
    {
      name: `${cuisine} & Co`,
      rating: 4.3,
      reviewCount: 278,
      price: '$$',
      address: '512 Amsterdam Ave, New York',
      lat: 40.7915,
      lng: -73.9725,
    },
  ];

  return mockBases.map((base, i) => ({
    id: `mock-${i}`,
    name: base.name,
    imageUrl: undefined,
    rating: base.rating,
    reviewCount: base.reviewCount,
    price: base.price,
    categories: [cuisine],
    address: base.address,
    city: 'New York',
    phone: undefined,
    yelpUrl: `https://www.yelp.com/search?find_desc=${encodeURIComponent(cuisine)}&find_loc=New+York`,
    menuUrl: undefined,
    lat: base.lat,
    lng: base.lng,
    distance: haversineMeters(NYC_REFERENCE.lat, NYC_REFERENCE.lng, base.lat, base.lng),
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cuisine = searchParams.get('cuisine') || '';
  const city = searchParams.get('city') || DEFAULT_CITY;
  const cuisineAdjacent = searchParams.get('adjacent') || undefined;

  if (!cuisine) {
    return NextResponse.json(
      { error: 'Missing required param: cuisine' },
      { status: 400 }
    );
  }

  try {
    const restaurants = await searchYelp(cuisine, city, cuisineAdjacent);
    return NextResponse.json({ restaurants, cuisine, city });
  } catch (error) {
    console.error('Restaurant search error:', error);
    return NextResponse.json(
      { restaurants: [], cuisine, city, error: 'Search failed' },
      { status: 200 }
    );
  }
}
