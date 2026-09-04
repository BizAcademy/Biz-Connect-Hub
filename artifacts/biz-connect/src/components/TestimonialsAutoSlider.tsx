import { useEffect, useRef } from 'react';
import type { Testimonial } from '@workspace/api-client-react';

const COUNTRY_FLAGS: Record<string, string> = {
  "Algérie": "🇩🇿", "Bénin": "🇧🇯", "Burkina Faso": "🇧🇫", "Burundi": "🇧🇮",
  "Cameroun": "🇨🇲", "Comores": "🇰🇲", "Congo": "🇨🇬", "Côte d'Ivoire": "🇨🇮",
  "Djibouti": "🇩🇯", "Gabon": "🇬🇦", "Guinée": "🇬🇳", "Guinée-Bissau": "🇬🇼",
  "Madagascar": "🇲🇬", "Mali": "🇲🇱", "Maurice": "🇲🇺", "Mauritanie": "🇲🇷",
  "Maroc": "🇲🇦", "Niger": "🇳🇪", "République Centrafricaine": "🇨🇫",
  "République Démocratique du Congo": "🇨🇩", "Rwanda": "🇷🇼", "Sénégal": "🇸🇳",
  "Seychelles": "🇸🇨", "Tchad": "🇹🇩", "Togo": "🇹🇬", "Tunisie": "🇹🇳",
  "Vanuatu": "🇻🇺", "Congo-Brazzaville": "🇨🇬", "Guinée équatoriale": "🇬🇶",
};

const AMOUNT_PATTERN = /(\d[\d\s.,]*\s?(?:f\s?cfa|fcfa|xaf))/gi;

function renderText(text: string) {
  return text.split(AMOUNT_PATTERN).map((part, i) =>
    /^(?:\d[\d\s.,]*\s?(?:f\s?cfa|fcfa|xaf))$/i.test(part)
      ? <span key={i} className="font-black text-green-600">{part}</span>
      : <span key={i}>{part}</span>
  );
}

/**
 * Galerie auto-défilante pour les témoignages en images.
 * - Défilement CSS automatique, lent et lisible (via transform).
 * - L'utilisateur peut glisser pour accélérer, revenir en arrière ou sauter.
 * - Pas de ZAPPER — réservé aux vidéos.
 */
export function TestimonialsAutoSlider({ testimonials }: { testimonials: Testimonial[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  /** Position courante en pixels (négative = déplacement vers la gauche) */
  const xRef = useRef(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartPos = useRef(0);

  // Vitesse : 0.4 px/frame ≈ 24 px/s à 60 fps — lent mais lisible
  const SPEED = 0.4;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || testimonials.length === 0) return;

    // Attendre que le DOM soit rendu pour lire scrollWidth
    const startRAF = () => {
      const halfWidth = track.scrollWidth / 2;
      if (halfWidth === 0) {
        rafRef.current = requestAnimationFrame(startRAF);
        return;
      }

      const step = () => {
        if (!isDragging.current) {
          xRef.current -= SPEED;
          // Boucle sans couture : quand on atteint la moitié (début de la copie), on revient à 0
          if (xRef.current <= -halfWidth) {
            xRef.current += halfWidth;
          }
          track.style.transform = `translateX(${xRef.current}px)`;
        }
        rafRef.current = requestAnimationFrame(step);
      };

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(startRAF);
    return () => cancelAnimationFrame(rafRef.current);
  }, [testimonials.length]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartPos.current = xRef.current;
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !trackRef.current) return;
    const dx = e.clientX - dragStartX.current;
    let newX = dragStartPos.current + dx;
    // Maintenir la boucle pendant le drag
    const halfWidth = trackRef.current.scrollWidth / 2;
    if (halfWidth > 0) {
      if (newX > 0) newX -= halfWidth;
      if (newX < -halfWidth) newX += halfWidth;
    }
    xRef.current = newX;
    trackRef.current.style.transform = `translateX(${newX}px)`;
  };

  const onPointerUp = () => { isDragging.current = false; };

  if (testimonials.length === 0) return null;

  const doubled = [...testimonials, ...testimonials];

  return (
    /* Viewport clipping */
    <div
      ref={viewportRef}
      className="overflow-hidden w-full cursor-grab active:cursor-grabbing select-none pb-2"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Track animé */}
      <div
        ref={trackRef}
        className="flex items-start will-change-transform"
        style={{ gap: '1rem', width: 'max-content' }}
      >
        {doubled.map((t, idx) => (
          <div
            key={`img-${t.id}-${idx}`}
            className="h-fit self-start bg-card border border-border rounded-2xl overflow-hidden shadow-[0_8px_0_rgba(30,64,175,0.14),0_18px_30px_rgba(15,23,42,0.18)] flex flex-col shrink-0"
            style={{ width: 'min(20rem, calc(100vw - 3rem))' }}
            draggable={false}
          >
            {/* En-tête */}
            <div className="p-3 pb-2 sm:p-4 sm:pb-3">
              <div className="font-bold text-xs leading-snug sm:text-sm">
                {t.name}
                {t.country && (
                  <>
                    <span>{` · ${t.country}`}</span>
                    <span className="ml-1" title={`Drapeau du ${t.country}`}>
                      {COUNTRY_FLAGS[t.country] ?? '🌍'}
                    </span>
                  </>
                )}
              </div>
              {t.duration && (
                <div className="text-[11px] text-primary font-semibold sm:text-xs">
                  Résultat en {t.duration}
                </div>
              )}
              {t.text && (
                <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-5 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-relaxed">
                  {renderText(t.text)}
                </p>
              )}
            </div>

            {/* Capture d'écran */}
            {t.mediaUrl && (
              <div className="mx-2 mb-3 overflow-hidden rounded-xl border border-border/60 bg-muted/20 p-1 sm:mx-3 sm:mb-4">
                <img
                  src={t.mediaUrl}
                  alt={`Témoignage de ${t.name}`}
                  className="block h-auto max-h-[32rem] w-full rounded-lg bg-white object-contain"
                  draggable={false}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
