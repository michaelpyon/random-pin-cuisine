'use client';

import type { Restaurant } from '@/lib/types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  index: number;
  pinLocationName?: string;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters)} ft`;
  return `${miles.toFixed(1)} mi`;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" title={`${rating.toFixed(1)} stars`}>
      {'★'.repeat(full)}
      {hasHalf && '½'}
      {'☆'.repeat(empty)}
      <span className="ml-1 text-sm text-slate-300 font-medium">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function RestaurantCard({
  restaurant,
  index,
  pinLocationName,
}: RestaurantCardProps) {
  const {
    name,
    imageUrl,
    rating,
    reviewCount,
    price,
    categories,
    address,
    phone,
    yelpUrl,
    menuUrl,
    distance,
  } = restaurant;

  // Google Maps URLs for action buttons
  const reserveUrl = `https://www.google.com/maps/search/${encodeURIComponent(
    name + ' reservations ' + address
  )}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    name + ' ' + address
  )}&travelmode=walking`;

  return (
    <div
      className="restaurant-card group relative bg-slate-800/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-orange-500/30 transition-all duration-300"
      style={{
        animationDelay: `${index * 120}ms`,
        animationFillMode: 'both',
      }}
    >
      {/* Accent line */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex gap-4 p-4">
        {/* Image */}
        {imageUrl && (
          <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <h3 className="font-semibold text-white truncate text-base">
                {name}
              </h3>
            </div>
            {price && (
              <span className="flex-shrink-0 text-sm text-emerald-400 font-medium">
                {price}
              </span>
            )}
          </div>

          {/* Rating + distance */}
          <div className="flex items-center gap-3 mt-1.5 text-sm">
            {rating > 0 && <StarRating rating={rating} />}
            {reviewCount > 0 && (
              <span className="text-slate-400">
                {reviewCount.toLocaleString()} reviews
              </span>
            )}
            {distance !== undefined && (
              <span className="text-slate-500 flex items-center gap-1">
                <span className="text-xs">📍</span>
                {formatDistance(distance)}
              </span>
            )}
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {categories.slice(0, 3).map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 text-xs rounded-full bg-slate-700/80 text-slate-300"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Address */}
          <p className="mt-2 text-sm text-slate-400 truncate">{address}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex border-t border-slate-700/50">
        <a
          href={reserveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 text-center text-sm font-medium text-orange-400 hover:bg-orange-500/10 transition-colors border-r border-slate-700/50"
        >
          Reserve
        </a>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 text-center text-sm font-medium text-sky-400 hover:bg-sky-500/10 transition-colors border-r border-slate-700/50"
        >
          Directions
        </a>
        {menuUrl ? (
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 text-center text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          >
            Menu
          </a>
        ) : (
          <a
            href={yelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 text-center text-sm font-medium text-slate-400 hover:bg-slate-700/50 transition-colors"
          >
            Yelp
          </a>
        )}
      </div>
    </div>
  );
}
