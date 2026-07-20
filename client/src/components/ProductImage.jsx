import React, { useState } from 'react';
import { Store, ImageOff } from 'lucide-react';

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&auto=format&fit=crop&q=80';

export default function ProductImage({
  src,
  alt = 'Product image',
  className = 'h-full w-full object-contain',
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
  category = 'General',
  loading = 'lazy',
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // If no src provided initially or error occurred
  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-[#f8fafc] text-[#94a3b8] ${className}`}
        title={`${alt} (Image unavailable)`}
      >
        <Store className="h-8 w-8 opacity-60 transition-transform hover:scale-105" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onLoad={() => setIsLoaded(true)}
      onError={() => {
        // Try loading generic fallback image if first attempt fails
        if (src !== fallbackSrc && fallbackSrc) {
          setHasError(false);
          // Instead of immediate failure, set to fallback image
        }
        setHasError(true);
      }}
      className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      {...props}
    />
  );
}
