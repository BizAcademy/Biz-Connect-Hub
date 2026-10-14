import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { readVideoFormat, videoFormatRatio, writeVideoFormat } from '@/lib/video-format';

const formats = [
  ['', 'Automatique (Shorts : vertical ; lien YouTube classique : horizontal)'],
  ['9:16', 'Vertical — 9:16 (Reels, Shorts, WhatsApp)'],
  ['16:9', 'Horizontal — 16:9'],
  ['1:1', 'Carré — 1:1'],
  ['4:5', 'Portrait — 4:5'],
] as const;

export function VideoFormatField({ value, onChange }: {
  value: string;
  onChange: (value: string) => void;
}) {
  const saved = readVideoFormat(value);
  const ratio = videoFormatRatio(value);
  const preset = formats.find(([format]) => {
    if (!format) return !saved;
    const [w, h] = format.split(':').map(Number);
    return ratio !== null && Math.abs(w / h - ratio) < 0.00001;
  })?.[0];
  const [custom, setCustom] = useState(false);
  const [width, setWidth] = useState(saved.split(':')[0] || '1080');
  const [height, setHeight] = useState(saved.split(':')[1] || '1920');
  const isCustom = custom || (saved !== '' && preset === undefined);
  const applyDimensions = (w: string, h: string) => {
    const r = Number(w) / Number(h);
    if (Number(w) > 0 && Number(h) > 0 && r >= 0.25 && r <= 4) {
      onChange(writeVideoFormat(value, `${Number(w)}:${Number(h)}`));
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        Format de la vidéo d’origine
        <select
          className="mt-1 block w-full rounded-md border border-input bg-background p-2 text-sm"
          value={isCustom ? 'custom' : (preset ?? '')}
          onChange={(event) => {
            const next = event.target.value;
            setCustom(next === 'custom');
            if (next === 'custom') applyDimensions(width, height);
            else onChange(writeVideoFormat(value, next));
          }}
        >
          {formats.map(([format, label]) => <option key={format} value={format}>{label}</option>)}
          <option value="custom">Dimensions personnalisées</option>
        </select>
      </label>
      {isCustom && (
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">Largeur d’origine (px)
            <Input type="number" min="1" step="1" value={width}
              onChange={(event) => { setWidth(event.target.value); applyDimensions(event.target.value, height); }} />
          </label>
          <label className="text-sm">Hauteur d’origine (px)
            <Input type="number" min="1" step="1" value={height}
              onChange={(event) => { setHeight(event.target.value); applyDimensions(width, event.target.value); }} />
          </label>
          {(!(Number(width) > 0 && Number(height) > 0) || Number(width) / Number(height) < 0.25 || Number(width) / Number(height) > 4) &&
            <p role="alert" className="w-full text-xs text-destructive">Dimensions invalides : le rapport largeur / hauteur doit être compris entre 1:4 et 4:1. Le dernier format valide reste appliqué.</p>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Pour une vidéo verticale hébergée sur un lien YouTube classique, choisissez Vertical.
        Le lien seul ne révèle pas toujours le format original. Les bandes déjà enregistrées dans le fichier ne peuvent pas être supprimées ici.
      </p>
    </div>
  );
}
