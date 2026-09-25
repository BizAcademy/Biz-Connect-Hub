import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Shared, non-destructive reveal system.
 * Only toggles a `data-reveal` attribute on block-level containers.
 * Reveal uses the independent CSS `translate` property, so it never fights
 * Framer Motion inline `transform` values. Never wraps/remounts elements.
 */
const TARGETS = [
  'main > *:not([class*="container"])',
  'main > [class*="container"] > *:not([data-reveal-group])',
  '[data-reveal-group] > *',
  'section',
  'footer',
  '[role="tabpanel"] > *',
  '[data-reveal-auto]',
].join(',');

function isFixedLike(el: Element): boolean {
  const p = getComputedStyle(el).position;
  return p === 'fixed' || p === 'sticky';
}

function isUnsafe(el: HTMLElement): boolean {
  if (el.closest('[role="dialog"],[data-radix-popper-content-wrapper],[data-no-reveal]')) return true;
  if (el.matches('header, nav, video, iframe, form *, [data-reveal-group]')) return true;
  if (isFixedLike(el)) return true;
  // Never translate an ancestor of fixed/sticky elements
  for (const d of Array.from(el.querySelectorAll('header, nav, [class*="fixed"], [class*="sticky"]'))) {
    if (isFixedLike(d)) return true;
  }
  // Avoid nested reveals
  if (el.parentElement?.closest('[data-reveal]')) return true;
  if (el.querySelector('[data-reveal]')) return true;
  return false;
}

export function MotionSystem() {
  const [location] = useLocation();

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root || typeof IntersectionObserver === 'undefined') return;

    const frames = new Set<number>();
    const raf = (fn: () => void) => {
      const id = requestAnimationFrame(() => { frames.delete(id); fn(); });
      frames.add(id);
    };
    const show = (el: HTMLElement) => { el.dataset.reveal = 'in'; };
    const revealAllPending = () =>
      root.querySelectorAll<HTMLElement>('[data-reveal="pending"]').forEach(show);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show(e.target as HTMLElement);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );

    const scan = () => {
      const vh = window.innerHeight;
      for (const el of Array.from(root.querySelectorAll<HTMLElement>(TARGETS))) {
        if (el.dataset.reveal || isUnsafe(el)) continue;
        const top = el.getBoundingClientRect().top;
        el.dataset.reveal = 'pending';
        if (top < vh * 0.95) raf(() => show(el));
        else io.observe(el);
      }
    };

    scan();
    let scanQueued = false;
    const mo = new MutationObserver(() => {
      if (scanQueued) return;
      scanQueued = true;
      raf(() => { scanQueued = false; scan(); });
    });
    mo.observe(root, { childList: true, subtree: true });

    const onScroll = () =>
      root.querySelectorAll<HTMLElement>('[data-reveal="pending"]').forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) show(el);
      });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('beforeprint', revealAllPending);

    return () => {
      io.disconnect();
      mo.disconnect();
      frames.forEach((id) => cancelAnimationFrame(id));
      frames.clear();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeprint', revealAllPending);
      // Nothing may stay hidden once observers are gone.
      revealAllPending();
    };
  }, [location]);

  return null;
}
