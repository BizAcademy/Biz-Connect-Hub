import { useState, type ImgHTMLAttributes } from 'react';

export function imageDisplayUrl(src: string, width = 640): string {
  return /^\/api\/media\/\d+\/content(?:\?|$)/.test(src)
    ? `${src.split('?')[0]}/${width}` : src;
}

/** Responsive database derivatives, deferred decoding and a quiet loading surface. */
export function SmartImage({ src = '', alt = '', className = '', sizes,
  loading = 'lazy', onLoad, onError, style, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const local = /^\/api\/media\/\d+\/content(?:\?|$)/.test(src);
  const loaded = loadedSrc === src;
  const failed = failedSrc === src;
  return <img
    {...props}
    src={failed ? 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360"%3E%3Crect width="100%25" height="100%25" fill="%23f1f5f9"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%2364748b" font-size="22"%3EImage indisponible%3C/text%3E%3C/svg%3E' : imageDisplayUrl(src)}
    srcSet={local && !failed ? [160, 320, 640, 960, 1440].map(width => `${imageDisplayUrl(src, width)} ${width}w`).join(', ') : undefined}
    sizes={sizes ?? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 640px'}
    alt={failed ? `${alt} — image indisponible` : alt}
    loading={loading}
    decoding="async"
    className={`${className} ${!loaded && !failed ? 'bg-muted' : ''}`}
    style={{ ...style, color: loaded || failed ? style?.color : 'transparent' }}
    onLoad={event => { setLoadedSrc(src); onLoad?.(event); }}
    onError={event => { if (!failed) setFailedSrc(src); onError?.(event); }}
  />;
}
