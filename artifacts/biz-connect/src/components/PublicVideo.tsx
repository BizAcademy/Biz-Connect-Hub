import { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';

type EmbeddedVideo = {
  url: string;
  aspectClass: string;
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

function toEmbedUrl(url: string): EmbeddedVideo | null {
  if (!url) return null;
  const ytShort = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i);
  if (ytShort) {
    return {
      url: `https://www.youtube.com/embed/${ytShort[1]}`,
      aspectClass: 'aspect-[9/16] max-w-md mx-auto',
    };
  }
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  if (yt) return { url: `https://www.youtube.com/embed/${yt[1]}`, aspectClass: 'aspect-video' };
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return { url: `https://player.vimeo.com/video/${vimeo[1]}`, aspectClass: 'aspect-video' };
  const dm = url.match(/dailymotion\.com\/(?:video|embed\/video)\/([A-Za-z0-9]+)/i);
  if (dm) return { url: `https://www.dailymotion.com/embed/video/${dm[1]}`, aspectClass: 'aspect-video' };

  const instagram = url.match(/instagram\.com\/(reel|p)\/([^/?#]+)/i);
  if (instagram) {
    return {
      url: `https://www.instagram.com/${instagram[1]}/${instagram[2]}/embed/captioned/`,
      aspectClass: 'aspect-[9/16] max-w-md mx-auto',
    };
  }

  const tiktok = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (tiktok) {
    return {
      url: `https://www.tiktok.com/embed/v2/${tiktok[1]}`,
      aspectClass: 'aspect-[9/16] max-w-md mx-auto',
    };
  }

  if (/facebook\.com|fb\.watch/i.test(url)) {
    return {
      url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
      aspectClass: 'aspect-video',
    };
  }

  return null;
}

export function PublicVideo({
  url,
  posterUrl,
  title = "Vidéo",
  className = "",
}: {
  url: string;
  posterUrl?: string | null;
  title?: string;
  className?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [reloadToken, setReloadToken] = useState('2');
  const [duration, setDuration] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    setIsPlaying(false);
    setDuration(null);
    setHasError(false);
  }, [url, reloadToken]);
  
  if (!url) return null;

  const embedUrl = toEmbedUrl(url);

  if (embedUrl) {
    return (
      <div className={`w-full rounded-xl overflow-hidden ${embedUrl.aspectClass} ${className}`}>
        <iframe
          src={embedUrl.url}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
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
  const playableUrl = toPlayableVideoUrl(url, reloadToken);

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
        onError={() => setHasError(true)}
        onLoadedData={() => {
          if (!posterUrl && videoRef.current && videoRef.current.currentTime === 0) {
            videoRef.current.currentTime = 0.1;
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
