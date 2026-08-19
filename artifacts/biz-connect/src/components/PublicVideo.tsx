import { useState, useRef } from 'react';
import { PlayCircle } from 'lucide-react';

type EmbeddedVideo = {
  url: string;
  aspectClass: string;
};

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
  const videoRef = useRef<HTMLVideoElement>(null);
  
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

  return (
    <div className={`relative w-full rounded-xl overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={url}
        controls={isPlaying}
        playsInline
        preload="auto"
        poster={posterUrl || undefined}
        className="block w-full h-auto max-h-[80vh] object-contain"
        onPlaying={() => setIsPlaying(true)}
        onEnded={() => setIsPlaying(false)}
        onLoadedData={() => {
          if (!posterUrl && videoRef.current && videoRef.current.currentTime === 0) {
            videoRef.current.currentTime = 0.1;
          }
        }}
        style={isPlaying ? {} : { pointerEvents: 'none' }}
      />

      {!isPlaying && (
        <div 
          role="button"
          tabIndex={0}
          aria-label={title ? `Lire la vidéo : ${title}` : "Lire la vidéo"}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center cursor-pointer group focus:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-inset"
          onClick={handlePlay}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handlePlay();
            }
          }}
        >
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors duration-300" />

          <div className="relative z-20 bg-white/20 p-4 rounded-full backdrop-blur-md border border-white/30 text-white shadow-2xl motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-110">
            <PlayCircle className="w-12 h-12 fill-white text-primary" />
          </div>
        </div>
      )}
    </div>
  );
}
