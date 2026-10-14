import type { Partner } from '@workspace/api-client-react';
import { InfiniteSlider } from './InfiniteSlider';
import { SmartImage } from './SmartImage';

export function PartnerLogos({ partners }: { partners: Partner[] }) {
  const logos = partners.filter(partner => partner.logoUrl).map(partner =>
    <div key={partner.id} className="flex h-24 w-36 sm:w-48 shrink-0 items-center justify-center">
      <SmartImage original src={partner.logoUrl} alt={partner.name || 'Partenaire'}
        className="max-h-full max-w-full w-auto h-auto object-contain" />
    </div>);
  if (!logos.length) return null;
  return logos.length <= 2
    ? <div className="mx-auto flex max-w-5xl items-center justify-center gap-4 px-4 sm:gap-10">{logos}</div>
    : <InfiniteSlider speed={31.25} direction="left" gap={32}>{logos}</InfiniteSlider>;
}
