import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListMedia, useDeleteMedia, getListMediaQueryKey,
} from '@workspace/api-client-react';
import { Loader2, Trash2, Upload, Copy, Film, Image as ImageIcon, ArrowRightLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCloudinaryUpload } from '@/hooks/use-cloudinary-upload';

function adminReq(pwd: string) {
  return { request: { headers: { 'x-admin-password': pwd } } };
}

// ─── Types SSE migration ──────────────────────────────────────────────────────

type MigrateEvent =
  | { type: 'start'; total: number }
  | { type: 'processing'; id: number; name: string; publicId: string }
  | { type: 'step'; id: number; step: string; bytes?: number }
  | { type: 'refs_updated'; id: number; count: number }
  | { type: 'migrated'; id: number; name: string; newUrl: string; newPublicId: string; refsUpdated: number }
  | { type: 'warning'; id: number; message: string }
  | { type: 'error'; id: number; name: string; message: string }
  | { type: 'done'; migrated: number; skipped: number; errors: number }
  | { type: 'fatal'; message: string };

type PendingStatus = { pending: number; videos: { id: number; name: string; publicId: string; url: string }[] };

function stepLabel(step: string, bytes?: number): string {
  const mb = bytes != null ? ` (${(bytes / 1024 / 1024).toFixed(1)} Mo)` : '';
  switch (step) {
    case 'download': return `Téléchargement depuis Cloudinary${mb}…`;
    case 'upload': return `Upload vers Supabase${mb}…`;
    case 'update_db': return 'Mise à jour de la base de données…';
    case 'delete_cloudinary': return 'Suppression sur Cloudinary…';
    default: return step;
  }
}

// ─── Panneau de migration ─────────────────────────────────────────────────────

function MigrationPanel({ pwd, onDone }: { pwd: string; onDone: () => void }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<PendingStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/admin/migrate-cloudinary-videos/status', {
        headers: { 'x-admin-password': pwd },
      });
      if (res.ok) setStatus(await res.json() as PendingStatus);
    } catch {
      // ignore
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const startMigration = async () => {
    setMigrating(true);
    setLog([]);
    setDone(false);

    try {
      const res = await fetch('/api/admin/migrate-cloudinary-videos', {
        method: 'POST',
        headers: { 'x-admin-password': pwd },
      });
      if (!res.ok || !res.body) {
        toast({ title: 'Erreur', description: 'La migration a échoué', variant: 'destructive' });
        setMigrating(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const addLog = (msg: string) => setLog((l) => [...l, msg]);

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6)) as MigrateEvent;
            switch (ev.type) {
              case 'start':
                addLog(ev.total === 0
                  ? '✅ Aucune vidéo Cloudinary à migrer.'
                  : `🚀 Démarrage — ${ev.total} vidéo(s) à migrer.`);
                break;
              case 'processing':
                addLog(`▶ [${ev.id}] ${ev.name || ev.publicId}`);
                break;
              case 'step':
                addLog(`  · ${stepLabel(ev.step, ev.bytes)}`);
                break;
              case 'refs_updated':
                addLog(`  · ${ev.count} référence(s) de contenu mise(s) à jour.`);
                break;
              case 'migrated':
                addLog(`  ✅ Migré vers Supabase.`);
                break;
              case 'warning':
                addLog(`  ⚠ ${ev.message}`);
                break;
              case 'error':
                addLog(`  ❌ Erreur : ${ev.message}`);
                break;
              case 'done':
                addLog(`\n🏁 Terminé — ${ev.migrated} migré(s), ${ev.errors} erreur(s).`);
                setDone(true);
                onDone();
                fetchStatus();
                break;
              case 'fatal':
                addLog(`❌ Erreur fatale : ${ev.message}`);
                break;
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setLog((prev: string[]) => [...prev, `❌ Erreur réseau : ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setMigrating(false);
    }
  };

  if (status === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        {loadingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Vérification des vidéos Cloudinary…
      </div>
    );
  }

  if (status.pending === 0 && log.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600">
        <CheckCircle2 className="w-4 h-4" />
        Toutes les vidéos sont déjà sur Supabase Storage.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status.pending > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium text-amber-800">
              {status.pending} vidéo{status.pending > 1 ? 's' : ''} encore sur Cloudinary
            </p>
            <ul className="text-amber-700 text-xs space-y-0.5">
              {status.videos.slice(0, 5).map((v) => (
                <li key={v.id} className="truncate">• {v.name || v.publicId}</li>
              ))}
              {status.videos.length > 5 && (
                <li>… et {status.videos.length - 5} autre(s)</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {log.length > 0 && (
        <pre className="rounded-lg bg-zinc-900 text-zinc-100 text-xs p-3 overflow-auto max-h-64 whitespace-pre-wrap">
          {log.join('\n')}
        </pre>
      )}

      <div className="flex gap-2">
        {!done && status.pending > 0 && (
          <Button
            size="sm"
            disabled={migrating}
            onClick={startMigration}
          >
            {migrating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Migration en cours…</>
              : <><ArrowRightLeft className="w-4 h-4 mr-2" />Migrer vers Supabase</>
            }
          </Button>
        )}
        <Button variant="outline" size="sm" disabled={loadingStatus || migrating} onClick={fetchStatus}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loadingStatus ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>
    </div>
  );
}

// ─── Onglet Médias ────────────────────────────────────────────────────────────

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
    <div className="space-y-4">
      {/* ── Migration Cloudinary → Supabase ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Migration Cloudinary → Supabase
          </CardTitle>
          <CardDescription>
            Les nouvelles vidéos sont stockées sur Supabase. Ce panneau migre les vidéos restantes sur Cloudinary.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MigrationPanel pwd={pwd} onDone={refresh} />
        </CardContent>
      </Card>

      {/* ── Bibliothèque de médias ── */}
      <Card>
        <CardHeader>
          <CardTitle>Médias</CardTitle>
          <CardDescription>
            Images et vidéos. Copie l'URL d'un média pour l'utiliser ailleurs sur le site.
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
                      <video src={m.url} className="w-full h-full object-contain bg-black" muted playsInline />
                    ) : (
                      <img src={m.url} alt={m.name} className="w-full h-full object-contain bg-muted" loading="lazy" />
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
    </div>
  );
}
