import type { ReactNode } from 'react';

interface InfiniteSliderProps {
  children: ReactNode[];
  speed?: number; // seconds for one full loop
  direction?: 'left' | 'right';
  gap?: number;
}

/**
 * CSS-only infinite auto-scroll ticker.
 * Duplicates children so the loop is seamless.
 */
export function InfiniteSlider({
  children,
  speed = 30,
  direction = 'left',
  gap = 24,
}: InfiniteSliderProps) {
  const style = {
    '--slider-speed': `${speed}s`,
  } as React.CSSProperties;

  return (
    <div className="slider-viewport overflow-hidden w-full" style={style}>
      <div
        className={`flex items-center ${direction === 'right' ? 'animate-slider-right' : 'animate-slider-left'}`}
        style={{ gap: `${gap}px` }}
      >
        {/* Original set */}
        {children.map((child, i) => (
          <div key={`a-${i}`} className="shrink-0">
            {child}
          </div>
        ))}
        {/* Duplicate for seamless loop — hidden from AT and non-focusable */}
        {children.map((child, i) => (
          <div key={`b-${i}`} className="shrink-0" aria-hidden inert>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
