import { NextRequest, NextResponse } from 'next/server';

// Claude API for cuisine classification
// Falls back to mock data if ANTHROPIC_API_KEY is not set

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

interface ClassifyResponse {
  cuisineType: string;
  description: string;
  culturalBlurb: string;
  cuisineAdjacent?: string;
}

const SYSTEM_PROMPT = `You are a cuisine classification expert. Given a location (city, state/region, country), identify the most specific regional cuisine from that area.

Respond ONLY with valid JSON in this exact format:
{
  "cuisineType": "The specific cuisine name (e.g. 'Sichuan Chinese', 'Neapolitan Italian', 'Oaxacan Mexican')",
  "description": "One punchy sentence about what makes this cuisine distinctive. Be specific and opinionated, not encyclopedic.",
  "culturalBlurb": "2-3 sentences of cultural context. What would a traveler discover eating here? Include a signature dish name. Write like a travel magazine, not Wikipedia.",
  "cuisineAdjacent": "Optional. If this cuisine is very niche and NYC might not have exact matches, suggest the closest broader category (e.g. 'Central Asian' for Kyrgyz cuisine). Omit this field if the cuisine is well-represented in NYC."
}

Rules:
- Be as specific as possible. "Italian" is too broad if you can say "Sicilian Italian" or "Roman Italian".
- The culturalBlurb should make someone hungry. Name real dishes.
- Keep cuisineType under 30 characters.
- No markdown, no explanation, just the JSON object.`;

async function classifyWithClaude(
  locationName: string,
  lat: number,
  lng: number
): Promise<ClassifyResponse> {
  if (!ANTHROPIC_API_KEY) {
    return getMockClassification(locationName);
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Location: ${locationName}\nCoordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error('Claude API error:', response.status, await response.text());
    return getMockClassification(locationName);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;

  if (!text) {
    return getMockClassification(locationName);
  }

  try {
    const parsed = JSON.parse(text);
    return {
      cuisineType: parsed.cuisineType || 'Regional cuisine',
      description: parsed.description || 'A distinctive local food tradition.',
      culturalBlurb:
        parsed.culturalBlurb || 'This region has a rich culinary heritage worth exploring.',
      cuisineAdjacent: parsed.cuisineAdjacent || undefined,
    };
  } catch {
    console.error('Failed to parse Claude response:', text);
    return getMockClassification(locationName);
  }
}

function getMockClassification(locationName: string): ClassifyResponse {
  // Simple keyword-based fallback when no API key is available
  const lower = locationName.toLowerCase();

  const mocks: Record<string, ClassifyResponse> = {
    japan: {
      cuisineType: 'Japanese',
      description:
        'Precision, seasonality, and umami in every bite. From sushi counters to ramen stalls, Japanese cuisine treats food as craft.',
      culturalBlurb:
        'In Japan, every meal follows the principle of ichigo ichie: this moment, only once. A bowl of tonkotsu ramen in Fukuoka or hand-pressed nigiri in Tsukiji is never just lunch. Signature dish: omakase sushi.',
    },
    italy: {
      cuisineType: 'Italian',
      description:
        'Simplicity elevated. Three ingredients, done perfectly, every single time.',
      culturalBlurb:
        'Italian nonnas have been doing farm-to-table since before it had a hashtag. Every region argues its pasta is the best, and they are all correct. Signature dish: cacio e pepe.',
    },
    france: {
      cuisineType: 'French',
      description:
        'The blueprint for fine dining. Butter, technique, and centuries of culinary ego.',
      culturalBlurb:
        'France invented the restaurant, the Michelin star, and the idea that lunch should take two hours. A croissant in Paris or cassoulet in Toulouse is a religious experience. Signature dish: coq au vin.',
    },
    mexico: {
      cuisineType: 'Mexican',
      description:
        'Ancient techniques, bold flavors, and a UNESCO-recognized food tradition.',
      culturalBlurb:
        'Mexican cuisine predates European contact by millennia. Mole sauces with 30+ ingredients, hand-pressed tortillas, and mezcal that tastes like smoke and earth. Signature dish: mole negro.',
    },
    india: {
      cuisineType: 'Indian',
      description:
        'A subcontinent of spice, where every state has its own culinary identity.',
      culturalBlurb:
        'India has more distinct regional cuisines than most continents have countries. From Kerala fish curry to Rajasthani dal bati, the spice blends alone are a lifetime study. Signature dish: biryani.',
    },
    thailand: {
      cuisineType: 'Thai',
      description:
        'Sweet, sour, salty, spicy: all four in every dish, perfectly balanced.',
      culturalBlurb:
        'Thai street food vendors pull off flavor combinations that take Western chefs years to learn. A plate of pad kra pao from a Bangkok sidewalk stall costs $1 and tastes like revelation. Signature dish: som tum.',
    },
  };

  for (const [key, value] of Object.entries(mocks)) {
    if (lower.includes(key)) return value;
  }

  return {
    cuisineType: 'Regional cuisine',
    description: `The local food traditions of ${locationName} reflect generations of culinary innovation.`,
    culturalBlurb: `Every region tells its story through food. ${locationName} is no exception, with dishes shaped by geography, climate, and centuries of cultural exchange. Drop a pin to discover what makes this place delicious.`,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const locationName = searchParams.get('location') || '';

  if (isNaN(lat) || isNaN(lng) || !locationName) {
    return NextResponse.json(
      { error: 'Missing required params: lat, lng, location' },
      { status: 400 }
    );
  }

  try {
    const result = await classifyWithClaude(locationName, lat, lng);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Classification error:', error);
    return NextResponse.json(
      {
        cuisineType: 'Regional cuisine',
        description: `The local food traditions of ${locationName}.`,
        culturalBlurb: 'Something went wrong classifying this cuisine. Try again!',
        error: true,
      },
      { status: 200 } // Still 200 so the flow doesn't break
    );
  }
}
