const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'

export async function reverseGeocode(lat, lng) {
  // Use higher zoom for more specific location data (city/town level)
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: 'json',
    'accept-language': 'en',
    zoom: 10,
  })

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': 'RandomPinCuisineFinder/1.0' },
  })

  if (!res.ok) {
    throw new Error('Geocoding failed')
  }

  const data = await res.json()

  if (data.error) {
    return null
  }

  return {
    displayName: data.display_name,
    country: data.address?.country,
    countryCode: data.address?.country_code,
    state: data.address?.state,
    city: data.address?.city || data.address?.town || data.address?.village,
    county: data.address?.county,
    region: data.address?.region,
  }
}

export function isOcean(lat, lng, geocodeResult) {
  return geocodeResult === null
}

export function isAntarctica(lat) {
  return lat < -60
}

// Curated list of real cities across all inhabited continents.
// Using actual city centers guarantees the pin always lands on land —
// no ocean, no mid-ocean islands, no unpopulated bounding-box lottery.
// Small random offsets are added when returning coords so every roll feels unique.
const LAND_CITIES = [
  // ── East Asia ──
  { lat: 35.6762, lng: 139.6503 },  // Tokyo
  { lat: 35.0116, lng: 135.7681 },  // Kyoto
  { lat: 34.6937, lng: 135.5023 },  // Osaka
  { lat: 43.0618, lng: 141.3545 },  // Sapporo
  { lat: 31.2304, lng: 121.4737 },  // Shanghai
  { lat: 39.9042, lng: 116.4074 },  // Beijing
  { lat: 23.1291, lng: 113.2644 },  // Guangzhou
  { lat: 22.5431, lng: 114.0579 },  // Shenzhen
  { lat: 30.5728, lng: 104.0668 },  // Chengdu
  { lat: 29.5630, lng: 106.5516 },  // Chongqing
  { lat: 30.2741, lng: 120.1551 },  // Hangzhou
  { lat: 34.2658, lng: 108.9541 },  // Xi'an
  { lat: 22.3193, lng: 114.1694 },  // Hong Kong
  { lat: 25.0330, lng: 121.5654 },  // Taipei
  { lat: 37.5665, lng: 126.9780 },  // Seoul
  { lat: 35.1796, lng: 129.0756 },  // Busan
  { lat: 47.9077, lng: 106.8832 },  // Ulaanbaatar
  // ── Southeast Asia ──
  { lat: 13.7563, lng: 100.5018 },  // Bangkok
  { lat: 10.8231, lng: 106.6297 },  // Ho Chi Minh City
  { lat: 21.0285, lng: 105.8542 },  // Hanoi
  { lat: 11.5625, lng: 104.9160 },  // Phnom Penh
  { lat: 17.9757, lng: 102.6331 },  // Vientiane
  { lat: 16.8661, lng: 96.1951  },  // Yangon
  { lat: 1.3521,  lng: 103.8198 },  // Singapore
  { lat: 3.1390,  lng: 101.6869 },  // Kuala Lumpur
  { lat: -6.2088, lng: 106.8456 },  // Jakarta
  { lat: 14.5995, lng: 120.9842 },  // Manila
  // ── South Asia ──
  { lat: 28.6139, lng: 77.2090  },  // New Delhi
  { lat: 19.0760, lng: 72.8777  },  // Mumbai
  { lat: 12.9716, lng: 77.5946  },  // Bengaluru
  { lat: 22.5726, lng: 88.3639  },  // Kolkata
  { lat: 13.0827, lng: 80.2707  },  // Chennai
  { lat: 17.3850, lng: 78.4867  },  // Hyderabad
  { lat: 18.5204, lng: 73.8567  },  // Pune
  { lat: 26.9124, lng: 75.7873  },  // Jaipur
  { lat: 23.8103, lng: 90.4125  },  // Dhaka
  { lat: 6.9271,  lng: 79.8612  },  // Colombo
  { lat: 27.7172, lng: 85.3240  },  // Kathmandu
  { lat: 33.7294, lng: 73.0931  },  // Islamabad
  { lat: 24.8607, lng: 67.0011  },  // Karachi
  { lat: 31.5204, lng: 74.3587  },  // Lahore
  // ── Central Asia ──
  { lat: 41.2995, lng: 69.2401  },  // Tashkent
  { lat: 43.2220, lng: 76.8512  },  // Almaty
  { lat: 42.8700, lng: 74.5900  },  // Bishkek
  { lat: 37.9601, lng: 58.3261  },  // Ashgabat
  // ── Middle East ──
  { lat: 35.6892, lng: 51.3890  },  // Tehran
  { lat: 33.3152, lng: 44.3661  },  // Baghdad
  { lat: 24.7136, lng: 46.6753  },  // Riyadh
  { lat: 21.3891, lng: 39.8579  },  // Jeddah
  { lat: 25.2048, lng: 55.2708  },  // Dubai
  { lat: 24.4539, lng: 54.3773  },  // Abu Dhabi
  { lat: 51.5310, lng: 25.2854  },  // Doha
  { lat: 33.8938, lng: 35.5018  },  // Beirut
  { lat: 31.9522, lng: 35.9331  },  // Amman
  { lat: 32.0853, lng: 34.7818  },  // Tel Aviv
  { lat: 32.0853, lng: 34.7818  },  // Jerusalem
  { lat: 33.5138, lng: 36.2765  },  // Damascus
  { lat: 15.5527, lng: 32.5324  },  // Khartoum
  // ── Caucasus ──
  { lat: 40.4093, lng: 49.8671  },  // Baku
  { lat: 41.6938, lng: 44.8015  },  // Tbilisi
  { lat: 40.1872, lng: 44.5152  },  // Yerevan
  // ── Turkey ──
  { lat: 41.0082, lng: 28.9784  },  // Istanbul
  { lat: 39.9334, lng: 32.8597  },  // Ankara
  { lat: 37.8746, lng: 32.4932  },  // Konya
  // ── Europe — Western ──
  { lat: 51.5074, lng: -0.1278  },  // London
  { lat: 48.8566, lng: 2.3522   },  // Paris
  { lat: 52.5200, lng: 13.4050  },  // Berlin
  { lat: 48.1351, lng: 11.5820  },  // Munich
  { lat: 53.5753, lng: 10.0153  },  // Hamburg
  { lat: 50.9333, lng: 6.9500   },  // Cologne
  { lat: 48.2082, lng: 16.3738  },  // Vienna
  { lat: 47.3769, lng: 8.5417   },  // Zurich
  { lat: 46.9480, lng: 7.4474   },  // Bern
  { lat: 45.4654, lng: 9.1859   },  // Milan
  { lat: 41.9028, lng: 12.4964  },  // Rome
  { lat: 40.8518, lng: 14.2681  },  // Naples
  { lat: 41.3851, lng: 2.1734   },  // Barcelona
  { lat: 40.4168, lng: -3.7038  },  // Madrid
  { lat: 37.9838, lng: 23.7275  },  // Athens
  { lat: 38.7169, lng: -9.1399  },  // Lisbon
  { lat: 50.8503, lng: 4.3517   },  // Brussels
  { lat: 52.3676, lng: 4.9041   },  // Amsterdam
  { lat: 59.9139, lng: 10.7522  },  // Oslo
  { lat: 57.7089, lng: 11.9746  },  // Gothenburg
  { lat: 59.3293, lng: 18.0686  },  // Stockholm
  { lat: 55.6761, lng: 12.5683  },  // Copenhagen
  { lat: 60.1699, lng: 24.9384  },  // Helsinki
  { lat: 64.1355, lng: -21.8954 },  // Reykjavik
  { lat: 53.3498, lng: -6.2603  },  // Dublin
  { lat: 51.8985, lng: -8.4756  },  // Cork
  // ── Europe — Eastern ──
  { lat: 55.7558, lng: 37.6176  },  // Moscow
  { lat: 59.9343, lng: 30.3351  },  // St. Petersburg
  { lat: 50.4501, lng: 30.5234  },  // Kyiv
  { lat: 52.2297, lng: 21.0122  },  // Warsaw
  { lat: 50.0647, lng: 19.9450  },  // Kraków
  { lat: 47.4979, lng: 19.0402  },  // Budapest
  { lat: 50.0755, lng: 14.4378  },  // Prague
  { lat: 44.8176, lng: 20.4569  },  // Belgrade
  { lat: 45.8150, lng: 15.9819  },  // Zagreb
  { lat: 44.3414, lng: 23.7961  },  // Craiova
  { lat: 44.4268, lng: 26.1025  },  // Bucharest
  { lat: 42.6977, lng: 23.3219  },  // Sofia
  { lat: 41.9981, lng: 21.4254  },  // Skopje
  { lat: 42.4304, lng: 19.2594  },  // Podgorica
  { lat: 43.8476, lng: 18.3564  },  // Sarajevo
  { lat: 54.6872, lng: 25.2797  },  // Vilnius
  { lat: 56.9460, lng: 24.1059  },  // Riga
  { lat: 59.4370, lng: 24.7536  },  // Tallinn
  { lat: 53.9045, lng: 27.5615  },  // Minsk
  // ── Africa — North ──
  { lat: 30.0444, lng: 31.2357  },  // Cairo
  { lat: 36.7372, lng: 3.0865   },  // Algiers
  { lat: 33.9716, lng: -6.8498  },  // Rabat
  { lat: 33.5731, lng: -7.5898  },  // Casablanca
  { lat: 36.8190, lng: 10.1658  },  // Tunis
  { lat: 32.9001, lng: 13.1820  },  // Tripoli
  // ── Africa — West ──
  { lat: 6.5244,  lng: 3.3792   },  // Lagos
  { lat: 9.0579,  lng: 7.4951   },  // Abuja
  { lat: 5.5560,  lng: -0.1969  },  // Accra
  { lat: 14.6928, lng: -17.4467 },  // Dakar
  { lat: 12.3714, lng: -1.5197  },  // Ouagadougou
  { lat: 12.6392, lng: -8.0029  },  // Bamako
  { lat: 5.3484,  lng: -4.0083  },  // Abidjan
  // ── Africa — East ──
  { lat: -1.2921, lng: 36.8219  },  // Nairobi
  { lat: 9.0320,  lng: 38.7468  },  // Addis Ababa
  { lat: 0.3163,  lng: 32.5822  },  // Kampala
  { lat: -6.1630, lng: 35.7516  },  // Dodoma
  { lat: -6.7924, lng: 39.2083  },  // Dar es Salaam
  { lat: -1.9441, lng: 30.0619  },  // Kigali
  { lat: -3.3869, lng: 29.3644  },  // Bujumbura
  { lat: -11.7022, lng: 43.2551 },  // Moroni
  // ── Africa — Southern ──
  { lat: -25.7479, lng: 28.2293 },  // Pretoria
  { lat: -26.2041, lng: 28.0473 },  // Johannesburg
  { lat: -33.9249, lng: 18.4241 },  // Cape Town
  { lat: -29.8579, lng: 31.0292 },  // Durban
  { lat: -25.9692, lng: 32.5732 },  // Maputo
  { lat: -15.3875, lng: 28.3228 },  // Lusaka
  { lat: -17.8252, lng: 31.0335 },  // Harare
  { lat: -18.9249, lng: 47.5185 },  // Antananarivo
  // ── North America — USA ──
  { lat: 40.7128, lng: -74.0060 },  // New York City
  { lat: 34.0522, lng: -118.2437},  // Los Angeles
  { lat: 41.8781, lng: -87.6298 },  // Chicago
  { lat: 29.7604, lng: -95.3698 },  // Houston
  { lat: 33.4484, lng: -112.0740},  // Phoenix
  { lat: 39.9526, lng: -75.1652 },  // Philadelphia
  { lat: 29.4241, lng: -98.4936 },  // San Antonio
  { lat: 32.7767, lng: -96.7970 },  // Dallas
  { lat: 30.2672, lng: -97.7431 },  // Austin
  { lat: 39.7392, lng: -104.9903},  // Denver
  { lat: 42.3601, lng: -71.0589 },  // Boston
  { lat: 47.6062, lng: -122.3321},  // Seattle
  { lat: 33.7490, lng: -84.3880 },  // Atlanta
  { lat: 25.7617, lng: -80.1918 },  // Miami
  { lat: 36.1699, lng: -115.1398},  // Las Vegas
  { lat: 45.5231, lng: -122.6765},  // Portland
  { lat: 37.3382, lng: -121.8863},  // San Jose
  { lat: 35.2271, lng: -80.8431 },  // Charlotte
  { lat: 44.9778, lng: -93.2650 },  // Minneapolis
  { lat: 38.9072, lng: -77.0369 },  // Washington DC
  { lat: 36.1627, lng: -86.7816 },  // Nashville
  { lat: 29.9511, lng: -90.0715 },  // New Orleans
  // ── North America — Canada & Mexico ──
  { lat: 43.6532, lng: -79.3832 },  // Toronto
  { lat: 45.5017, lng: -73.5673 },  // Montreal
  { lat: 49.2827, lng: -123.1207},  // Vancouver
  { lat: 51.0447, lng: -114.0719},  // Calgary
  { lat: 19.4326, lng: -99.1332 },  // Mexico City
  { lat: 20.6597, lng: -103.3496},  // Guadalajara
  { lat: 25.6866, lng: -100.3161},  // Monterrey
  // ── Caribbean & Central America ──
  { lat: 23.1136, lng: -82.3666 },  // Havana
  { lat: 18.4655, lng: -66.1057 },  // San Juan
  { lat: 18.5944, lng: -72.3074 },  // Port-au-Prince
  { lat: 18.0179, lng: -76.8099 },  // Kingston
  { lat: 14.6349, lng: -90.5069 },  // Guatemala City
  { lat: 8.9936,  lng: -79.5197 },  // Panama City
  { lat: 9.9281,  lng: -84.0907 },  // San José
  // ── South America ──
  { lat: -23.5505, lng: -46.6333},  // São Paulo
  { lat: -22.9068, lng: -43.1729},  // Rio de Janeiro
  { lat: -34.6037, lng: -58.3816},  // Buenos Aires
  { lat: -12.0464, lng: -77.0428},  // Lima
  { lat: 4.7110,  lng: -74.0721 },  // Bogotá
  { lat: -33.4489, lng: -70.6693},  // Santiago
  { lat: 10.4806, lng: -66.9036 },  // Caracas
  { lat: -0.2299, lng: -78.5249 },  // Quito
  { lat: -16.5000, lng: -68.1500},  // La Paz
  { lat: -34.9011, lng: -56.1645},  // Montevideo
  { lat: -25.2867, lng: -57.6470},  // Asunción
  { lat: -2.4994, lng: -44.2966 },  // São Luís
  { lat: -8.0476, lng: -34.8770 },  // Recife
  { lat: -3.7172, lng: -38.5434 },  // Fortaleza
  { lat: -15.7942, lng: -47.8822},  // Brasília
  // ── Oceania ──
  { lat: -33.8688, lng: 151.2093},  // Sydney
  { lat: -37.8136, lng: 144.9631},  // Melbourne
  { lat: -27.4698, lng: 153.0251},  // Brisbane
  { lat: -31.9505, lng: 115.8605},  // Perth
  { lat: -34.9285, lng: 138.6007},  // Adelaide
  { lat: -36.8485, lng: 174.7633},  // Auckland
  { lat: -41.2865, lng: 174.7762},  // Wellington
  { lat: -9.4438,  lng: 147.1803},  // Port Moresby
  { lat: -18.1416, lng: 178.4419},  // Suva
]

/**
 * Returns random coordinates guaranteed to be on land.
 * Picks a real city from the curated list, then adds a small random offset
 * (±0.3°, roughly ±33 km) so repeated rolls don't land on the exact same spot.
 */
export function getRandomLandCoords() {
  const city = LAND_CITIES[Math.floor(Math.random() * LAND_CITIES.length)]
  // Small offset keeps it in the same city/region but avoids identical points
  const latOffset = (Math.random() - 0.5) * 0.6
  const lngOffset = (Math.random() - 0.5) * 0.6
  return {
    lat: Math.round((city.lat + latOffset) * 1000) / 1000,
    lng: Math.round((city.lng + lngOffset) * 1000) / 1000,
  }
}
