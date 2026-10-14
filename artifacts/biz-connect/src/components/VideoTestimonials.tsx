import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Testimonial } from '@workspace/api-client-react';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { PublicVideo } from './PublicVideo';

export function VideoTestimonials({ items, renderHeader }: {
  items: Testimonial[];
  renderHeader: (item: Testimonial) => ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const settling = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [selected, setSelected] = useState(0);
  const active = Math.min(selected, Math.max(0, items.length - 1));
  useEffect(() => () => clearTimeout(settling.current), []);
  useEffect(() => {
    const container = viewport.current;
    const card = container?.children[active] as HTMLElement | undefined;
    if (!container || !card) return;
    const measure = () => { container.style.height = `${card.getBoundingClientRect().height + 12}px`; };
    measure();
    if (!('ResizeObserver' in window)) return;
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, [active, items]);
  const goTo = (index: number) => {
    if (!items.length) return;
    const next = (index + items.length) % items.length;
    clearTimeout(settling.current);
    setSelected(next);
    const card = viewport.current?.children[next] as HTMLElement | undefined;
    if (card && viewport.current) {
      settling.current = setTimeout(() => { settling.current = undefined; }, 600);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      viewport.current.scrollTo({
        left: card.offsetLeft,
        behavior: reduced || Math.abs(next - active) > 1 ? 'auto' : 'smooth',
      });
    }
  };
  if (!items.length) return null;
  return <div role="region" aria-roledescription="carrousel" aria-label="Témoignages vidéo"
    onKeyDown={event => {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); goTo(active + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(active - 1); }
    }} tabIndex={0}>
    <div ref={viewport} className="relative flex items-start gap-5 overflow-x-auto overflow-y-hidden snap-x snap-mandatory pb-3"
      style={{ scrollbarWidth: 'none', paddingRight: 'max(0px, calc(100% - 32rem))' }}
      onPointerDown={() => { clearTimeout(settling.current); settling.current = undefined; }}
      onScroll={() => {
        if (!viewport.current || settling.current) return;
        const left = viewport.current.scrollLeft;
        const cards = Array.from(viewport.current.children) as HTMLElement[];
        let next = 0;
        cards.forEach((card, index) => {
          if (Math.abs(card.offsetLeft - left) < Math.abs(cards[next].offsetLeft - left)) next = index;
        });
        setSelected(next);
      }}>
      {items.map((item, index) => <article key={item.id}
        aria-label={`Témoignage ${index + 1} sur ${items.length} : ${item.name}`}
        className="h-fit self-start bg-card border border-border rounded-2xl overflow-hidden shadow-md flex flex-col shrink-0 w-full snap-start sm:w-[32rem] sm:max-w-full">
        {renderHeader(item)}
        {item.mediaUrl && <div className="mx-2 rounded-xl border border-border/60 bg-slate-900 p-1 sm:mx-3">
          {index === active
            ? <PublicVideo key={item.id} url={item.mediaUrl} title={`Témoignage de ${item.name}`} className="rounded-xl" preload="metadata" />
            : <button type="button" onClick={() => goTo(index)} aria-label={`Voir la vidéo de ${item.name}`}
              className="aspect-video w-full flex flex-col items-center justify-center gap-2 rounded-lg text-white">
              <Play aria-hidden="true" size={40} /><span>Voir ce témoignage</span>
            </button>}
        </div>}
        <button type="button" disabled={items.length < 2}
          onClick={() => goTo(index + 1)}
          aria-label={`Zapper vers le témoignage suivant après ${item.name}`}
          className="mt-3 flex w-full items-center justify-end gap-2 bg-blue-600 px-4 py-3 text-sm font-bold uppercase text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] disabled:opacity-50">
          Zapper <ArrowRight size={20} aria-hidden="true" />
        </button>
      </article>)}
    </div>
    <div className="mt-2 flex items-center justify-between gap-3">
      <button type="button" onClick={() => goTo(active - 1)} disabled={items.length < 2}
        className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-40">
        <ArrowLeft size={16} aria-hidden="true" /> Précédent
      </button>
      <span role="status" aria-live="polite" className="text-sm text-muted-foreground">{active + 1} / {items.length}</span>
      <button type="button" onClick={() => goTo(active + 1)} disabled={items.length < 2}
        className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
        Zapper <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  </div>;
}
