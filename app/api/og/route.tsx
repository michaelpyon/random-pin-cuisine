import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const locationName = searchParams.get('loc') || 'Somewhere on Earth';
  const cuisine = searchParams.get('cuisine') || 'Regional cuisine';
  const culturalBlurb = searchParams.get('blurb') || '';
  const restaurantName = searchParams.get('restaurant') || '';
  const rating = searchParams.get('rating') || '';
  const city = searchParams.get('city') || 'NYC';

  // Truncate blurb for the card
  const blurbDisplay =
    culturalBlurb.length > 120
      ? culturalBlurb.slice(0, 117) + '...'
      : culturalBlurb;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'system-ui, sans-serif',
          color: 'white',
        }}
      >
        {/* Top: Location arrow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '28px',
            color: '#94a3b8',
          }}
        >
          <span style={{ fontSize: '32px' }}>📍</span>
          <span>{locationName}</span>
          <span style={{ margin: '0 8px', color: '#475569' }}>→</span>
          <span style={{ fontSize: '32px' }}>🍽️</span>
          <span style={{ color: '#f97316', fontWeight: 700 }}>{city.toUpperCase()}</span>
        </div>

        {/* Middle: Cuisine name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontSize: '64px',
              fontWeight: 800,
              color: '#f97316',
              lineHeight: 1.1,
            }}
          >
            {cuisine}
          </div>
          {blurbDisplay && (
            <div
              style={{
                fontSize: '22px',
                color: '#cbd5e1',
                lineHeight: 1.5,
                maxWidth: '900px',
              }}
            >
              &ldquo;{blurbDisplay}&rdquo;
            </div>
          )}
        </div>

        {/* Bottom: Restaurant + branding */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {restaurantName && (
              <div style={{ fontSize: '24px', fontWeight: 600 }}>
                Tonight: {restaurantName}
                {rating && (
                  <span style={{ color: '#fbbf24', marginLeft: '12px' }}>
                    ★ {rating}
                  </span>
                )}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: '18px',
              color: '#64748b',
              fontWeight: 500,
            }}
          >
            random-pin.michaelpyon.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
