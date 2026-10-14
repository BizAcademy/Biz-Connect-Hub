import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListCloudinaryImages, getListCloudinaryImagesQueryKey,
  migrateCloudinaryImage, type ImageMigrationCandidate,
} from '@workspace/api-client-react';
import { ArrowRightLeft, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ImageMigrationPanel({ pwd }: { pwd: string }) {
  const qc = useQueryClient();
  const query = useListCloudinaryImages({ request: { headers: { 'x-admin-password': pwd } } });
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const locked = useRef(false);
  const images = query.data ?? [];

  async function transfer(selected: ImageMigrationCandidate[]) {
    if (locked.current || !selected.length) return;
    if (!window.confirm(
      `Transférer ${selected.length} image${selected.length > 1 ? 's' : ''} dans la base de données ? Les liens du site seront remplacés automatiquement après chaque transfert réussi. Les originaux Cloudinary ne seront pas supprimés.`,
    )) return;
    locked.current = true;
    setProgress({ done: 0, total: selected.length, failed: 0 });
    setErrors({});
    try {
      for (const image of selected) {
        setActive(image.url);
        try {
          await migrateCloudinaryImage({ url: image.url }, { headers: { 'x-admin-password': pwd } });
          qc.setQueryData<ImageMigrationCandidate[]>(getListCloudinaryImagesQueryKey(),
            current => current?.filter(item => item.url !== image.url));
          setProgress(p => ({ ...p, done: p.done + 1 }));
        } catch (error) {
          const data = (error as { data?: { error?: string } })?.data;
          setErrors(current => ({ ...current, [image.url]: data?.error ?? 'Le transfert a échoué. Le lien actuel est conservé ; vous pouvez réessayer.' }));
          setProgress(p => ({ ...p, failed: p.failed + 1 }));
        }
      }
    } finally {
      await qc.invalidateQueries();
      setActive(null);
      locked.current = false;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4" /> Images Cloudinary → base de données
        </CardTitle>
        <CardDescription>
          Transférez vos images sans les télécharger à nouveau. Le site utilisera automatiquement
          la copie en base à la place du lien Cloudinary. Les originaux ne sont pas supprimés.
          Les vidéos ne sont pas concernées. Maximum : 10 Mo par image.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? <p role="status">Recherche des images Cloudinary…</p> : query.isError ? (
          <p role="alert" className="text-destructive">Impossible de charger la liste des images. Actualisez pour réessayer.</p>
        ) : <p className="text-sm font-medium">{images.length
          ? `${images.length} image${images.length > 1 ? 's' : ''} à transférer`
          : 'Aucune image Cloudinary à transférer dans les contenus configurés et la bibliothèque.'}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!!active || !images.length || query.isError} onClick={() => transfer([...images])}>
            {active ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
            {active ? 'Transfert en cours…' : 'Tout transférer en base'}
          </Button>
          <Button type="button" variant="outline" disabled={!!active || query.isFetching} onClick={() => query.refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
          </Button>
        </div>
        {!!progress.total && (
          <p role="status" aria-live="polite" className="text-sm">
            {progress.done} image(s) transférée(s), {progress.failed} échec(s), sur {progress.total}.
            {active ? ' Gardez cette page ouverte. Les transferts déjà terminés sont conservés.'
              : progress.done ? ' Les liens des images transférées sont maintenant remplacés sur le site.' : " Aucun lien n'a été modifié."}
          </p>
        )}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {images.map(image => (
            <div key={image.url} className="rounded-lg border p-3 flex flex-wrap items-center gap-3">
              <img src={image.url} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-14 h-14 object-contain rounded bg-muted" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-all">{image.name}</p>
                <p className="text-xs text-muted-foreground">{image.locations.join(' · ')}</p>
                {errors[image.url] && <p role="alert" className="text-xs text-destructive mt-1">{errors[image.url]}</p>}
              </div>
              <Button type="button" size="sm" variant="outline" disabled={!!active} onClick={() => transfer([image])}>
                {active === image.url ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {errors[image.url] ? 'Réessayer' : 'Transférer en base'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
