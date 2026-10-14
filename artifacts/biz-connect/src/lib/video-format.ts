const marker = 'bca-aspect';

export function readVideoFormat(value: string): string {
  const attribute = value.match(/\bdata-aspect-ratio\s*=\s*["'](\d+(?:\.\d+)?)[:/](\d+(?:\.\d+)?)["']/i);
  const fragment = value.match(/[#&]bca-aspect=(\d+(?:\.\d+)?)(?::|%3A|\/)(\d+(?:\.\d+)?)/i);
  const match = attribute ?? fragment;
  if (!match) return '';
  const ratio = Number(match[1]) / Number(match[2]);
  return Number.isFinite(ratio) && ratio >= 0.25 && ratio <= 4
    ? `${match[1]}:${match[2]}`
    : '';
}

export function videoFormatRatio(value: string): number | null {
  const format = readVideoFormat(value);
  if (!format) return null;
  const [width, height] = format.split(':').map(Number);
  return width / height;
}

// Persist alongside the existing URL, so no database migration is required.
// Fragments are local metadata: they are not sent to the hosting platform.
export function writeVideoFormat(value: string, format: string): string {
  if (/<iframe\b/i.test(value)) {
    return value.replace(/<iframe\b[^>]*>/i, (tag) => {
      const clean = tag.replace(/\s+data-aspect-ratio\s*=\s*["'][^"']*["']/gi, '');
      return format ? clean.replace(/>$/, ` data-aspect-ratio="${format}">`) : clean;
    });
  }
  const hashIndex = value.indexOf('#');
  const base = hashIndex < 0 ? value : value.slice(0, hashIndex);
  const parts = hashIndex < 0 ? [] : value.slice(hashIndex + 1).split('&')
    .filter((part) => part && !part.startsWith(`${marker}=`));
  if (format) parts.push(`${marker}=${format}`);
  return base + (parts.length ? `#${parts.join('&')}` : '');
}
