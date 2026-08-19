import { useState, useRef } from 'react';
import { PlayCircle } from 'lucide-react';

function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const dm = url.match(/dailymotion\.com\/(?:video|embed\/video)\/([A-Za-z0-9]+)/i);
  if (dm) return `https://www.dailymotion.com/embed/video/${dm[1]}`;
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
      <div className={`aspect-video w-full rounded-xl overflow-hidden bg-slate-900 ${className}`}>
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  // Handle native video
  const handlePlay = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      void videoRef.current.play().catch(() => setIsPlaying(false));
    }
  };

  const isCover = className.includes('object-cover');

  return (
    <div className={`relative w-full rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center ${className}`}>
      <video
        ref={videoRef}
        src={url}
        controls={isPlaying}
        playsInline
        preload="metadata"
        poster={posterUrl || undefined}
        className={`w-full h-full max-h-[70vh] ${isCover ? 'object-cover' : 'object-contain'}`}
        onPlaying={() => setIsPlaying(true)}
        onEnded={() => setIsPlaying(false)}
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
          {posterUrl ? (
            <img src={posterUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/80 to-blue-900 flex items-center justify-center">
               <div className="text-white/20 absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9zdmc+')] opacity-30"></div>
               <img src="/logo-bca-blanc.png" alt="BCA" className="absolute top-4 left-4 h-8 w-auto opacity-30" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors duration-300" />

          <div className="relative z-20 bg-white/20 p-4 rounded-full backdrop-blur-md border border-white/30 text-white shadow-2xl motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-110">
            <PlayCircle className="w-12 h-12 fill-white text-primary" />
          </div>
        </div>
      )}
    </div>
  );
}
