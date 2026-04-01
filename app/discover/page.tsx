import type { Metadata } from 'next';
import { decodeDiscovery } from '@/lib/discovery-params';
import DiscoverClient from './DiscoverClient';

interface DiscoverPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: DiscoverPageProps): Promise<Metadata> {
  const params = await searchParams;
  const discovery = decodeDiscovery(params);

  if (!discovery) {
    return {
      title: 'Random Pin Cuisine',
      description: 'Drop a pin anywhere on Earth. Find that cuisine in NYC.',
    };
  }

  const title = `${discovery.cuisine} from ${discovery.locationName}`;
  const description = discovery.culturalBlurb || `Discover ${discovery.cuisine} restaurants in NYC`;

  // Build OG image URL
  const ogParams = new URLSearchParams({
    loc: discovery.locationName,
    cuisine: discovery.cuisine,
    blurb: discovery.culturalBlurb,
    city: discovery.city,
  });
  const ogUrl = `/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const params = await searchParams;
  const discovery = decodeDiscovery(params);

  if (!discovery) {
    return (
      <main className="discover-page min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold text-white mb-4">
            Discovery not found
          </h1>
          <p className="text-slate-400 mb-6">
            This link is missing or has expired.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
          >
            Drop a new pin
          </a>
        </div>
      </main>
    );
  }

  return <DiscoverClient discovery={discovery} />;
}
