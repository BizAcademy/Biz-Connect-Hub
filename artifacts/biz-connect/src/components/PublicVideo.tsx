import { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';
import { videoFormatRatio } from '@/lib/video-format';

type EmbeddedVideo = {
  url: string;
  aspectRatio: number;
  frameClass: string;
};

function toPlayableVideoUrl(url: string, reloadToken: string): string {
  try {
    const parsed = new URL(url);
    const uploadMarker = '/video/upload/';
    const uploadIndex = parsed.pathname.indexOf(uploadMarker);

    if (
      parsed.hostname !== 'res.cloudinary.com' ||
      uploadIndex === -1
    ) {
      return url;
    }

    const transformation = 'f_mp4,vc_h264,ac_aac/';
    const pathAfterUpload = parsed.pathname.slice(uploadIndex + uploadMarker.length);
    // A stable revision bypasses previously cached media without disabling
    // caching on every visit. A manual reload gets its own request URL.
    parsed.searchParams.set('bca_player', reloadToken);

    if (pathAfterUpload.startsWith(transformation)) {
      return parsed.toString();
    }

    parsed.pathname =
      parsed.pathname.slice(0, uploadIndex + uploadMarker.length) +
      transformation +
      pathAfterUpload;
    return parsed.toString();
  } catch {
    return url;
  }
}

function getDeclaredAspectRatio(markup: string): number | null {
  const configured = videoFormatRatio(markup);
  if (configured !== null) return configured;
  const iframeTag = markup.match(/<iframe\b[^>]*>/i)?.[0] ?? '';
  const ratioAttribute = iframeTag.match(/\bdata-aspect-ratio\s*=\s*(["'])(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\1/i);
  if (ratioAttribute) {
    const ratio = Number(ratioAttribute[2]) / Number(ratioAttribute[3]);
    if (Number.isFinite(ratio) && ratio >= 0.25 && ratio <= 4) return ratio;
  }

  const style = iframeTag.match(/\bstyle\s*=\s*(["'])(.*?)\1/i)?.[2] ?? '';
  const cssRatio = style.match(/aspect-ratio\s*:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/i);
  if (cssRatio) {
    const ratio = Number(cssRatio[1]) / Number(cssRatio[2]);
    if (Number.isFinite(ratio) && ratio >= 0.25 && ratio <= 4) return ratio;
  }

  const width = iframeTag.match(/\bwidth\s*=\s*(["']?)(\d+(?:\.\d+)?)(?:px)?\1/i)?.[2] ??
    style.match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)px/i)?.[1];
  const height = iframeTag.match(/\bheight\s*=\s*(["']?)(\d+(?:\.\d+)?)(?:px)?\1/i)?.[2] ??
    style.match(/(?:^|;)\s*height\s*:\s*(\d+(?:\.\d+)?)px/i)?.[1];
  if (!width || !height) return null;
  const ratio = Number(width) / Number(height);
  return Number.isFinite(ratio) && ratio >= 0.25 && ratio <= 4 ? ratio : null;
}

function toEmbedUrl(url: string, defaultAspectRatio?: number): EmbeddedVideo | null {
  if (!url) return null;
  // Accept the standard iframe snippet supplied by video platforms, but
  // extract only its URL and dimensions, then rebuild a trusted provider
  // embed below. Instagram's official snippet is often a blockquote instead.
  const iframeSrc = url.match(/<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i);
  const blockquoteCite = url.match(/<blockquote\b[^>]*\bcite\s*=\s*(["'])(.*?)\1/i);
  const sourceCandidate = iframeSrc?.[2] ?? blockquoteCite?.[2] ??
    (url.match(/https?:\/\/[^\s"'<>]+/i)?.[0] ?? url);
  const source = sourceCandidate.replace(/&amp;/gi, '&').trim();
  // A page default also covers existing entries and the generic 560×315
  // dimensions supplied by YouTube embed snippets. An explicitly saved
  // original format must always take precedence.
  const declaredAspectRatio = videoFormatRatio(url) ?? defaultAspectRatio ?? getDeclaredAspectRatio(url);
  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname;

  const ytShort = source.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i);
  if (ytShort && ['youtube.com', 'm.youtube.com'].includes(host)) {
    const aspectRatio = declaredAspectRatio ?? 9 / 16;
    return {
      url: `https://www.youtube.com/embed/${ytShort[1]}`,
      aspectRatio,
      frameClass: aspectRatio < 1 ? 'max-w-md mx-auto' : '',
    };
  }
  const ytId = host === 'youtu.be' ? path.slice(1).split('/')[0]
    : parsed.searchParams.get('v') ?? path.match(/^\/(?:embed|live)\/([A-Za-z0-9_-]+)/)?.[1];
  if (ytId && /^[A-Za-z0-9_-]{6,}$/.test(ytId) && ['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) {
    const embed = new URL(`https://www.youtube-nocookie.com/embed/${ytId}`);
    const start = parsed.searchParams.get('start') ?? parsed.searchParams.get('t');
    if (start && /^\d+$/.test(start)) embed.searchParams.set('start', start);
    const aspectRatio = declaredAspectRatio ?? 16 / 9;
    return { url: embed.toString(), aspectRatio, frameClass: aspectRatio < 1 ? 'max-w-md mx-auto' : '' };
  }
  const vimeo = path.match(/\/(?:video\/)?(\d+)/i);
  if (vimeo && ['vimeo.com', 'player.vimeo.com'].includes(host)) {
    const aspectRatio = declaredAspectRatio ?? 16 / 9;
    return { url: `https://player.vimeo.com/video/${vimeo[1]}`, aspectRatio, frameClass: aspectRatio < 1 ? 'max-w-md mx-auto' : '' };
  }
  const dm = path.match(/\/(?:video\/|embed\/video\/)([A-Za-z0-9]+)/i);
  const dmShort = host === 'dai.ly' ? path.match(/^\/([A-Za-z0-9]+)/) : null;
  if ((dm || dmShort) && ['dailymotion.com', 'dai.ly'].includes(host)) {
    const aspectRatio = declaredAspectRatio ?? 16 / 9;
    return { url: `https://www.dailymotion.com/embed/video/${(dm || dmShort)![1]}`, aspectRatio, frameClass: aspectRatio < 1 ? 'max-w-md mx-auto' : '' };
  }

  const instagram = path.match(/^\/(reel|p)\/([^/?#]+)/i);
  if (instagram && host === 'instagram.com') {
    const aspectRatio = declaredAspectRatio ?? (instagram[1].toLowerCase() === 'reel' ? 9 / 16 : 4 / 5);
    return {
      url: `https://www.instagram.com/${instagram[1]}/${instagram[2]}/embed/captioned/`,
      aspectRatio,
      frameClass: aspectRatio < 1 ? 'max-w-md mx-auto' : '',
    };
  }

  const tikTokPath = path.match(/\/@[^/]+\/video\/(\d+)/i);
  const tikTokEmbedPath = path.match(/^\/embed\/v2\/(\d+)/i);
  if ((tikTokPath || tikTokEmbedPath) && host === 'tiktok.com') {
    const id = (tikTokPath ?? tikTokEmbedPath)![1];
    const aspectRatio = declaredAspectRatio ?? 9 / 16;
    return {
      url: `https://www.tiktok.com/embed/v2/${id}`,
      aspectRatio,
      frameClass: aspectRatio < 1 ? 'max-w-md mx-auto' : '',
    };
  }

  if (host === 'facebook.com' || host === 'fb.watch') {
    const shareUrl = host === 'facebook.com' && path.startsWith('/plugins/video.php')
      ? parsed.searchParams.get('href')
      : source;
    if (!shareUrl) return null;
    try {
      const shared = new URL(shareUrl);
      const sharedHost = shared.hostname.toLowerCase().replace(/^www\./, '');
      if (shared.protocol !== 'https:' || !['facebook.com', 'fb.watch', 'm.facebook.com'].includes(sharedHost)) return null;
    } catch {
      return null;
    }
    const embed = new URL('https://www.facebook.com/plugins/video.php');
    embed.searchParams.set('href', shareUrl);
    embed.searchParams.set('show_text', 'false');
    const aspectRatio = declaredAspectRatio ?? 16 / 9;
    return { url: embed.toString(), aspectRatio, frameClass: aspectRatio < 1 ? 'max-w-md mx-auto' : '' };
  }

  return null;
}

export function PublicVideo({
  url,
  posterUrl,
  title = "Vidéo",
  className = "",
  defaultAspectRatio,
  portraitMaxWidth,
}: {
  url: string;
  posterUrl?: string | null;
  title?: string;
  className?: string;
  defaultAspectRatio?: number;
  portraitMaxWidth?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [reloadToken, setReloadToken] = useState('2');
  const [duration, setDuration] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [fallbackFor, setFallbackFor] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    setIsPlaying(false);
    setDuration(null);
    setHasError(false);
  }, [url, reloadToken]);
  
  if (!url) return null;

  const embedUrl = toEmbedUrl(url, defaultAspectRatio);

  if (embedUrl) {
    return (
      <div
        className={`w-full rounded-xl overflow-hidden bg-black shadow-lg ring-1 ring-black/10 ${embedUrl.frameClass} ${className}`}
        style={{
          aspectRatio: embedUrl.aspectRatio,
          ...(embedUrl.aspectRatio < 1 ? {
            maxWidth: portraitMaxWidth ?? `min(28rem, calc(80dvh * ${embedUrl.aspectRatio}))`,
            marginInline: 'auto',
          } : {}),
        }}
      >
        <iframe
          src={embedUrl.url}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="w-full h-full"
        />
      </div>
    );
  }

  const handlePlay = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      void videoRef.current.play().catch(() => setIsPlaying(false));
    }
  };
  // Do not transcode an already playable original. Cloudinary can serve a
  // short processing placeholder from an on-demand transformation URL.
  const sourceKey = `${url}:${reloadToken}`;
  const convertedUrl = toPlayableVideoUrl(url, reloadToken);
  const usingFallback = fallbackFor === sourceKey;
  const playableUrl = usingFallback ? convertedUrl : url;

  return (
    <div>
    <div className={`relative w-full rounded-xl overflow-hidden ${className}`}>
      <video
        key={`${playableUrl}:${reloadToken}`}
        ref={videoRef}
        src={playableUrl}
        controls={isPlaying}
        playsInline
        preload="metadata"
        poster={posterUrl || undefined}
        className="block w-full h-auto max-h-[80vh] object-contain"
        onPlaying={() => setIsPlaying(true)}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={(event) => {
          const seconds = event.currentTarget.duration;
          setDuration(Number.isFinite(seconds) ? seconds : null);
          setHasError(false);
        }}
        onDurationChange={(event) => {
          const seconds = event.currentTarget.duration;
          setDuration(Number.isFinite(seconds) ? seconds : null);
        }}
        onError={(event) => {
          const code = event.currentTarget.error?.code;
          setIsPlaying(false);
          if (!usingFallback && convertedUrl !== url && (code === 3 || code === 4)) {
            setDuration(null);
            setHasError(false);
            setFallbackFor(sourceKey);
          } else {
            setHasError(true);
          }
        }}
        style={isPlaying ? {} : { pointerEvents: 'none' }}
      />

      {!isPlaying && (
        <button
          type="button"
          aria-label={title ? `Lire la vidéo : ${title}` : "Lire la vidéo"}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center cursor-pointer group focus:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-inset"
          onClick={handlePlay}
        >
          <span className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors duration-300" />

          <span className="relative z-20 flex flex-col items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-white shadow-2xl border border-white/50 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105 group-hover:bg-blue-700">
            <Play aria-hidden="true" className="h-10 w-10 fill-current" />
            <span className="text-sm font-bold">Lire la vidéo</span>
          </span>
        </button>
      )}
    </div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span aria-live="polite">
        {hasError
          ? 'Impossible de charger cette vidéo. Essaie de la recharger.'
          : duration !== null
            ? `Durée chargée : ${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`
            : ''}
      </span>
      <button
        type="button"
        className="underline underline-offset-2 hover:opacity-80"
        onClick={() => {
          videoRef.current?.pause();
          setReloadToken(`2-${Date.now()}`);
        }}
      >
        Recharger la vidéo
      </button>
    </div>
    </div>
  );
}
