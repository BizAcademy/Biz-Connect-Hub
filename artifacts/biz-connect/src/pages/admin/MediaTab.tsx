import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListMedia, useDeleteMedia, getListMediaQueryKey,
} from '@workspace/api-client-react';
import { Loader2, Trash2, Upload, Copy, Film, Image as ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCloudinaryUpload } from '@/hooks/use-cloudinary-upload';

function adminReq(pwd: string) {
  return { request: { headers: { 'x-admin-password': pwd } } };
}

export function MediaTab({ pwd }: { pwd: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: items, isLoading } = useListMedia(adminReq(pwd));
  const del = useDeleteMedia(adminReq(pwd));
  const { uploadFile, isUploading } = useCloudinaryUpload(pwd);
  const [removeBg, setRemoveBg] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: getListMediaQueryKey() });

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Médias (Cloudinary)</CardTitle>
        <CardDescription>
          Images et vidéos stockées sur Cloudinary. Copie l'URL d'un média pour l'utiliser ailleurs sur le site.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-xl border border-border bg-muted/10">
          <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm cursor-pointer hover:bg-muted transition-colors">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isUploading ? 'Envoi en cours…' : 'Ajouter une image ou une vidéo'}
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              disabled={isUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const media = await uploadFile(file, { removeBackground: removeBg && file.type.startsWith('image') });
                if (media) {
                  refresh();
                  toast({ title: 'Média envoyé', description: media.name });
                } else {
                  toast({ title: 'Erreur', description: "Échec de l'envoi du fichier", variant: 'destructive' });
                }
                e.target.value = '';
              }}
            />
          </label>
          <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-primary"
              checked={removeBg}
              onChange={(e) => setRemoveBg(e.target.checked)}
            />
            Supprimer le fond (images uniquement — image détourée, qualité conservée)
          </label>
        </div>

        {(!items || items.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun média pour l'instant. Ajoute une image ou une vidéo ci-dessus.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((m) => (
              <div key={m.id} className="rounded-lg border border-border overflow-hidden bg-muted/10">
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {m.resourceType === 'video' ? (
                    <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={m.url} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="p-2 space-y-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {m.resourceType === 'video' ? <Film className="w-3 h-3 shrink-0" /> : <ImageIcon className="w-3 h-3 shrink-0" />}
                    <span className="truncate" title={m.name}>{m.name || m.publicId}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={async () => {
                        await navigator.clipboard.writeText(m.url);
                        toast({ title: 'URL copiée' });
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" /> URL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-destructive"
                      disabled={del.isPending}
                      onClick={() =>
                        del.mutate({ id: m.id }, {
                          onSuccess: () => { refresh(); toast({ title: 'Média supprimé' }); },
                          onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
                        })
                      }
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
