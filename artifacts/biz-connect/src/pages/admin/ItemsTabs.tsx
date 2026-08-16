import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListTrainings, useCreateTraining, useUpdateTraining, useDeleteTraining,
  useListTestimonials, useCreateTestimonial, useUpdateTestimonial, useDeleteTestimonial,
  useListAmbassadors, useCreateAmbassador, useUpdateAmbassador, useDeleteAmbassador,
  useListPartners, useCreatePartner, useUpdatePartner, useDeletePartner,
  useListPaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod,
  useListServices, useCreateService, useUpdateService, useDeleteService,
  useListFeatureItems, useCreateFeatureItem, useUpdateFeatureItem, useDeleteFeatureItem,
  useListHelpVideos, useCreateHelpVideo, useUpdateHelpVideo, useDeleteHelpVideo,
  useListMedia,
} from '@workspace/api-client-react';
import { Loader2, Plus, Trash2, Upload, Images, Pencil } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useCloudinaryUpload } from '@/hooks/use-cloudinary-upload';

function adminReq(pwd: string) {
  return { request: { headers: { 'x-admin-password': pwd } } };
}

// Reusable upload field: upload a new file to Cloudinary OR pick from the media gallery
function UploadField({
  pwd, value, onChange, label, accept = 'image/*',
}: {
  pwd: string;
  value: string;
  onChange: (url: string) => void;
  label: string;
  accept?: string;
}) {
  const { uploadFile, isUploading } = useCloudinaryUpload(pwd);
  const { toast } = useToast();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [removeBg, setRemoveBg] = useState(false);

  const { data: allMedia } = useListMedia(adminReq(pwd));

  // Filter gallery to the accepted resource type
  const wantsVideo = accept.includes('video');
  const wantsImage = accept.includes('image');
  const filteredMedia = (allMedia ?? []).filter((m) => {
    if (wantsVideo && !wantsImage) return m.resourceType === 'video';
    if (wantsImage && !wantsVideo) return m.resourceType === 'image';
    return true; // accept both
  });

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Upload new file to Cloudinary */}
        <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm cursor-pointer hover:bg-muted transition-colors">
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isUploading ? 'Envoi en cours…' : 'Importer'}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={isUploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const media = await uploadFile(file, { removeBackground: removeBg && !file.type.startsWith('video') });
              if (media) {
                onChange(media.url);
                toast({ title: 'Fichier envoyé' });
              } else {
                toast({ title: 'Erreur', description: "Échec de l'envoi du fichier", variant: 'destructive' });
              }
              e.target.value = '';
            }}
          />
        </label>

        {/* Pick from existing Cloudinary gallery */}
        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-2 h-9">
              <Images className="w-4 h-4" /> Galerie
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Choisir depuis la bibliothèque Cloudinary</DialogTitle>
              <DialogDescription>
                Clique sur un média pour le sélectionner.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto py-2 pr-1">
              {filteredMedia.length === 0 ? (
                <p className="col-span-3 text-sm text-muted-foreground text-center py-8">
                  Aucun média disponible. Importe d'abord depuis l'onglet « Médias ».
                </p>
              ) : (
                filteredMedia.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="rounded-lg border border-border overflow-hidden text-left hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    onClick={() => {
                      onChange(m.url);
                      setGalleryOpen(false);
                      toast({ title: 'Média sélectionné' });
                    }}
                  >
                    {m.resourceType === 'video' ? (
                      <video src={m.url} className="w-full aspect-square object-cover" muted playsInline />
                    ) : (
                      <img src={m.url} alt={m.name} className="w-full aspect-square object-cover" loading="lazy" />
                    )}
                    <div className="px-2 py-1 text-xs truncate text-muted-foreground">{m.name || m.publicId}</div>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview current value */}
        {value && (
          wantsImage && !wantsVideo ? (
            <img src={value} alt="" className="h-12 rounded-md border border-border object-contain bg-muted" />
          ) : (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{value}</span>
          )
        )}
      </div>
      {wantsImage && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            className="accent-primary"
            checked={removeBg}
            onChange={(e) => setRemoveBg(e.target.checked)}
          />
          Supprimer le fond (image détourée, qualité conservée)
        </label>
      )}
    </div>
  );
}

// Reusable edit dialog shell with save/cancel actions
function EditDialog({
  open, onOpenChange, title, onSave, isSaving, canSave = true, children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSave: () => void;
  isSaving: boolean;
  canSave?: boolean;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Modifie les champs puis enregistre.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">{children}</div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Annuler</Button>
          <Button onClick={onSave} disabled={isSaving || !canSave}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} title="Modifier">
      <Pencil className="w-4 h-4 text-muted-foreground" />
    </Button>
  );
}

function SectionCard({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}

// --------------------------------------------------------
// FORMATIONS
// --------------------------------------------------------
export function TrainingsTab({ pwd }: { pwd: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: items, isLoading } = useListTrainings();
  const create = useCreateTraining(adminReq(pwd));
  const update = useUpdateTraining(adminReq(pwd));
  const del = useDeleteTraining(adminReq(pwd));
  const [title, setTitle] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eBannerUrl, setEBannerUrl] = useState('');
  const [eLinkUrl, setELinkUrl] = useState('');

  const refresh = () => qc.invalidateQueries();

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <SectionCard title="Formations" desc="Bannières de formations affichées sur la page, avec bouton « Accéder maintenant »">
      <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/10">
        <Input placeholder="Titre de la formation" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Lien « Accéder maintenant » (https://…)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        <div className="md:col-span-2">
          <UploadField pwd={pwd} value={bannerUrl} onChange={setBannerUrl} label="Bannière (image)" />
        </div>
        <Button
          disabled={!title || create.isPending}
          onClick={() =>
            create.mutate({ data: { title, bannerUrl, linkUrl } }, {
              onSuccess: () => { setTitle(''); setBannerUrl(''); setLinkUrl(''); refresh(); toast({ title: 'Formation ajoutée' }); },
              onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
            })
          }
        >
          {create.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Ajouter
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {(items ?? []).map((t) => (
          <div key={t.id} className="border border-border rounded-xl overflow-hidden">
            {t.bannerUrl && <img src={t.bannerUrl} alt={t.title} className="w-full h-32 object-cover" />}
            <div className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{t.title}</div>
                <div className="text-xs text-muted-foreground truncate">{t.linkUrl || 'Aucun lien'}</div>
              </div>
              <div className="flex items-center shrink-0">
                <EditButton onClick={() => { setEditId(t.id); setETitle(t.title); setEBannerUrl(t.bannerUrl ?? ''); setELinkUrl(t.linkUrl ?? ''); }} />
                <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: t.id }, { onSuccess: refresh })}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {(items ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucune formation. La section utilisera le contenu par défaut.</p>}
      </div>

      <EditDialog
        open={editId !== null}
        onOpenChange={(o) => !o && setEditId(null)}
        title="Modifier la formation"
        isSaving={update.isPending}
        canSave={!!eTitle}
        onSave={() =>
          update.mutate({ id: editId!, data: { title: eTitle, bannerUrl: eBannerUrl, linkUrl: eLinkUrl } }, {
            onSuccess: () => { setEditId(null); refresh(); toast({ title: 'Formation modifiée' }); },
            onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
          })
        }
      >
        <Input placeholder="Titre de la formation" value={eTitle} onChange={(e) => setETitle(e.target.value)} />
        <Input placeholder="Lien « Accéder maintenant » (https://…)" value={eLinkUrl} onChange={(e) => setELinkUrl(e.target.value)} />
        <UploadField pwd={pwd} value={eBannerUrl} onChange={setEBannerUrl} label="Bannière (image)" />
      </EditDialog>
    </SectionCard>
  );
}

// --------------------------------------------------------
// TÉMOIGNAGES
// --------------------------------------------------------
export function TestimonialsTab({ pwd }: { pwd: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: items, isLoading } = useListTestimonials();
  const create = useCreateTestimonial(adminReq(pwd));
  const update = useUpdateTestimonial(adminReq(pwd));
  const del = useDeleteTestimonial(adminReq(pwd));
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [duration, setDuration] = useState('');
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [editId, setEditId] = useState<number | null>(null);
  const [eName, setEName] = useState('');
  const [eCountry, setECountry] = useState('');
  const [eDuration, setEDuration] = useState('');
  const [eText, setEText] = useState('');
  const [eMediaUrl, setEMediaUrl] = useState('');
  const [eMediaType, setEMediaType] = useState<'image' | 'video'>('image');

  const refresh = () => qc.invalidateQueries();

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <SectionCard title="Témoignages" desc="Vidéos ou captures d'écran de résultats, avec nom, pays et durée">
      <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/10">
        <Input placeholder="Nom (ex: Aïcha K.)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Pays (ex: Côte d'Ivoire)" value={country} onChange={(e) => setCountry(e.target.value)} />
        <Input placeholder="Durée pour le résultat (ex: 12 jours)" value={duration} onChange={(e) => setDuration(e.target.value)} />
        <Input placeholder="Texte affiché au-dessus du média" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex items-center gap-2">
          <select
            className="border border-border rounded-md px-3 py-2 text-sm bg-background"
            value={mediaType}
            onChange={(e) => { setMediaType(e.target.value as 'image' | 'video'); setMediaUrl(''); }}
          >
            <option value="image">Capture d'écran</option>
            <option value="video">Vidéo</option>
          </select>
        </div>
        <UploadField
          pwd={pwd}
          value={mediaUrl}
          onChange={setMediaUrl}
          label={mediaType === 'video' ? 'Vidéo (mp4…)' : 'Capture (image)'}
          accept={mediaType === 'video' ? 'video/*' : 'image/*'}
        />
        <Button
          disabled={!name || create.isPending}
          onClick={() =>
            create.mutate({ data: { name, country, duration, text, mediaUrl, mediaType } }, {
              onSuccess: () => {
                setName(''); setCountry(''); setDuration(''); setText(''); setMediaUrl('');
                refresh(); toast({ title: 'Témoignage ajouté' });
              },
              onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
            })
          }
        >
          {create.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Ajouter
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {(items ?? []).map((t) => (
          <div key={t.id} className="border border-border rounded-xl overflow-hidden">
            {t.mediaUrl && (t.mediaType === 'video'
              ? <video src={t.mediaUrl} className="w-full h-32 object-cover" muted />
              : <img src={t.mediaUrl} alt={t.name} className="w-full h-32 object-cover" />
            )}
            <div className="p-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{t.name} · {t.country}</div>
                <div className="text-xs text-muted-foreground truncate">{t.duration} — {t.text}</div>
              </div>
              <div className="flex items-center shrink-0">
                <EditButton onClick={() => {
                  setEditId(t.id); setEName(t.name); setECountry(t.country ?? ''); setEDuration(t.duration ?? '');
                  setEText(t.text ?? ''); setEMediaUrl(t.mediaUrl ?? ''); setEMediaType((t.mediaType === 'video' ? 'video' : 'image'));
                }} />
                <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: t.id }, { onSuccess: refresh })}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {(items ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun témoignage. La section utilisera le contenu par défaut.</p>}
      </div>

      <EditDialog
        open={editId !== null}
        onOpenChange={(o) => !o && setEditId(null)}
        title="Modifier le témoignage"
        isSaving={update.isPending}
        canSave={!!eName}
        onSave={() =>
          update.mutate({ id: editId!, data: { name: eName, country: eCountry, duration: eDuration, text: eText, mediaUrl: eMediaUrl, mediaType: eMediaType } }, {
            onSuccess: () => { setEditId(null); refresh(); toast({ title: 'Témoignage modifié' }); },
            onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
          })
        }
      >
        <Input placeholder="Nom (ex: Aïcha K.)" value={eName} onChange={(e) => setEName(e.target.value)} />
        <Input placeholder="Pays (ex: Côte d'Ivoire)" value={eCountry} onChange={(e) => setECountry(e.target.value)} />
        <Input placeholder="Durée pour le résultat (ex: 12 jours)" value={eDuration} onChange={(e) => setEDuration(e.target.value)} />
        <Input placeholder="Texte affiché au-dessus du média" value={eText} onChange={(e) => setEText(e.target.value)} />
        <select
          className="border border-border rounded-md px-3 py-2 text-sm bg-background"
          value={eMediaType}
          onChange={(e) => { setEMediaType(e.target.value as 'image' | 'video'); setEMediaUrl(''); }}
        >
          <option value="image">Capture d'écran</option>
          <option value="video">Vidéo</option>
        </select>
        <UploadField
          pwd={pwd}
          value={eMediaUrl}
          onChange={setEMediaUrl}
          label={eMediaType === 'video' ? 'Vidéo (mp4…)' : 'Capture (image)'}
          accept={eMediaType === 'video' ? 'video/*' : 'image/*'}
        />
      </EditDialog>
    </SectionCard>
  );
}

// --------------------------------------------------------
// GÉNÉRIQUE — listes d'images (portefeuille, partenaires, paiements)
// --------------------------------------------------------
function ImageListTab({
  pwd, title, desc, items, isLoading, onCreate, onUpdate, onDelete, isCreating, isUpdating, withName,
}: {
  pwd: string;
  title: string;
  desc: string;
  items: Array<{ id: number; url: string; label: string }>;
  isLoading: boolean;
  onCreate: (url: string, name: string, done: () => void) => void;
  onUpdate: (id: number, url: string, name: string, done: () => void) => void;
  onDelete: (id: number) => void;
  isCreating: boolean;
  isUpdating: boolean;
  withName?: boolean;
}) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [eUrl, setEUrl] = useState('');
  const [eName, setEName] = useState('');

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <SectionCard title={title} desc={desc}>
      <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/10 items-end">
        {withName && <Input placeholder="Nom (optionnel)" value={name} onChange={(e) => setName(e.target.value)} />}
        <UploadField pwd={pwd} value={url} onChange={setUrl} label="Image" />
        <Button disabled={!url || isCreating} onClick={() => onCreate(url, name, () => { setUrl(''); setName(''); })}>
          {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Ajouter
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((it) => (
          <div key={it.id} className="border border-border rounded-xl overflow-hidden">
            <img src={it.url} alt={it.label} className="w-full h-28 object-contain bg-muted" />
            <div className="p-2 flex items-center justify-between gap-2">
              <span className="text-xs truncate">{it.label || '—'}</span>
              <div className="flex items-center shrink-0">
                <EditButton onClick={() => { setEditId(it.id); setEUrl(it.url); setEName(it.label); }} />
                <Button variant="ghost" size="icon" onClick={() => onDelete(it.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Aucun élément. La section utilisera le contenu par défaut.</p>}
      </div>

      <EditDialog
        open={editId !== null}
        onOpenChange={(o) => !o && setEditId(null)}
        title={`Modifier — ${title}`}
        isSaving={isUpdating}
        canSave={!!eUrl}
        onSave={() => onUpdate(editId!, eUrl, eName, () => setEditId(null))}
      >
        {withName && <Input placeholder="Nom (optionnel)" value={eName} onChange={(e) => setEName(e.target.value)} />}
        <UploadField pwd={pwd} value={eUrl} onChange={setEUrl} label="Image" />
      </EditDialog>
    </SectionCard>
  );
}

// --------------------------------------------------------
// AMBASSADEURS
// --------------------------------------------------------
export function AmbassadorsTab({ pwd }: { pwd: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: items, isLoading } = useListAmbassadors();
  const create = useCreateAmbassador(adminReq(pwd));
  const update = useUpdateAmbassador(adminReq(pwd));
  const del = useDeleteAmbassador(adminReq(pwd));
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [eName, setEName] = useState('');
  const [eCountry, setECountry] = useState('');
  const [eImageUrl, setEImageUrl] = useState('');

  const refresh = () => qc.invalidateQueries();

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <SectionCard title="Nos ambassadeurs" desc="Capture d'écran + nom + pays. Affichés en slider horizontal sur la page d'accueil.">
      <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/10 items-end">
        <Input placeholder="Nom (ex: Aïcha K.)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Pays (ex: Cameroun)" value={country} onChange={(e) => setCountry(e.target.value)} />
        <UploadField pwd={pwd} value={imageUrl} onChange={setImageUrl} label="Capture d'écran" />
        <Button
          disabled={!name || !imageUrl || create.isPending}
          onClick={() =>
            create.mutate({ data: { name, country, imageUrl } }, {
              onSuccess: () => { setName(''); setCountry(''); setImageUrl(''); refresh(); toast({ title: 'Ambassadeur ajouté' }); },
              onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
            })
          }
        >
          {create.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Ajouter
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(items ?? []).map((a) => (
          <div key={a.id} className="border border-border rounded-xl overflow-hidden">
            <img src={a.imageUrl} alt={a.name} className="w-full h-40 object-cover" />
            <div className="p-2 flex items-center justify-between gap-2">
              <span className="text-xs truncate">{a.name}{a.country ? ` · ${a.country}` : ''}</span>
              <div className="flex items-center shrink-0">
                <EditButton onClick={() => { setEditId(a.id); setEName(a.name); setECountry(a.country ?? ''); setEImageUrl(a.imageUrl); }} />
                <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: a.id }, { onSuccess: refresh })}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {(items ?? []).length === 0 && <p className="text-sm text-muted-foreground col-span-full">Aucun ambassadeur configuré.</p>}
      </div>

      <EditDialog
        open={editId !== null}
        onOpenChange={(o) => !o && setEditId(null)}
        title="Modifier l'ambassadeur"
        isSaving={update.isPending}
        canSave={!!eName && !!eImageUrl}
        onSave={() =>
          update.mutate({ id: editId!, data: { name: eName, country: eCountry, imageUrl: eImageUrl } }, {
            onSuccess: () => { setEditId(null); refresh(); toast({ title: 'Ambassadeur modifié' }); },
            onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
          })
        }
      >
        <Input placeholder="Nom (ex: Aïcha K.)" value={eName} onChange={(e) => setEName(e.target.value)} />
        <Input placeholder="Pays (ex: Cameroun)" value={eCountry} onChange={(e) => setECountry(e.target.value)} />
        <UploadField pwd={pwd} value={eImageUrl} onChange={setEImageUrl} label="Capture d'écran" />
      </EditDialog>
    </SectionCard>
  );
}

export function PartnersTab({ pwd }: { pwd: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useListPartners();
  const create = useCreatePartner(adminReq(pwd));
  const update = useUpdatePartner(adminReq(pwd));
  const del = useDeletePartner(adminReq(pwd));

  return (
    <ImageListTab
      pwd={pwd}
      title="Partenaires"
      desc="Logos des partenaires affichés dans le slider"
      items={(data ?? []).map((p) => ({ id: p.id, url: p.logoUrl, label: p.name }))}
      isLoading={isLoading}
      isCreating={create.isPending}
      isUpdating={update.isPending}
      withName
      onCreate={(url, name, done) =>
        create.mutate({ data: { logoUrl: url, name } }, {
          onSuccess: () => { done(); qc.invalidateQueries(); toast({ title: 'Ajouté' }); },
          onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
        })
      }
      onUpdate={(id, url, name, done) =>
        update.mutate({ id, data: { logoUrl: url, name } }, {
          onSuccess: () => { done(); qc.invalidateQueries(); toast({ title: 'Modifié' }); },
          onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
        })
      }
      onDelete={(id) => del.mutate({ id }, { onSuccess: () => qc.invalidateQueries() })}
    />
  );
}

export function PaymentsTab({ pwd }: { pwd: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useListPaymentMethods();
  const create = useCreatePaymentMethod(adminReq(pwd));
  const update = useUpdatePaymentMethod(adminReq(pwd));
  const del = useDeletePaymentMethod(adminReq(pwd));

  return (
    <ImageListTab
      pwd={pwd}
      title="Moyens de paiement"
      desc="Logos des moyens de paiement affichés dans le slider"
      items={(data ?? []).map((p) => ({ id: p.id, url: p.logoUrl, label: p.name }))}
      isLoading={isLoading}
      isCreating={create.isPending}
      isUpdating={update.isPending}
      withName
      onCreate={(url, name, done) =>
        create.mutate({ data: { logoUrl: url, name } }, {
          onSuccess: () => { done(); qc.invalidateQueries(); toast({ title: 'Ajouté' }); },
          onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
        })
      }
      onUpdate={(id, url, name, done) =>
        update.mutate({ id, data: { logoUrl: url, name } }, {
          onSuccess: () => { done(); qc.invalidateQueries(); toast({ title: 'Modifié' }); },
          onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
        })
      }
      onDelete={(id) => del.mutate({ id }, { onSuccess: () => qc.invalidateQueries() })}
    />
  );
}

// --------------------------------------------------------
// SERVICES (« Voici ce que tu vas gagner »)
// --------------------------------------------------------
export function ServicesTab({ pwd }: { pwd: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: items, isLoading } = useListServices();
  const create = useCreateService(adminReq(pwd));
  const update = useUpdateService(adminReq(pwd));
  const del = useDeleteService(adminReq(pwd));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eDescription, setEDescription] = useState('');
  const [eIconUrl, setEIconUrl] = useState('');

  const refresh = () => qc.invalidateQueries();

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <SectionCard title="Services" desc="Cartes de la section « Voici ce que tu vas gagner » : icône, titre et description">
      <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/10">
        <Input placeholder="Titre du service" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="md:col-span-2">
          <UploadField pwd={pwd} value={iconUrl} onChange={setIconUrl} label="Icône (image)" />
        </div>
        <Button
          disabled={!title || create.isPending}
          onClick={() =>
            create.mutate({ data: { title, description, iconUrl } }, {
              onSuccess: () => { setTitle(''); setDescription(''); setIconUrl(''); refresh(); toast({ title: 'Service ajouté' }); },
              onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
            })
          }
        >
          {create.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Ajouter
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {(items ?? []).map((s) => (
          <div key={s.id} className="border border-border rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {s.iconUrl && <img src={s.iconUrl} alt="" className="w-10 h-10 object-contain rounded-md bg-muted shrink-0" />}
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground truncate">{s.description}</div>
              </div>
            </div>
            <div className="flex items-center shrink-0">
              <EditButton onClick={() => { setEditId(s.id); setETitle(s.title); setEDescription(s.description ?? ''); setEIconUrl(s.iconUrl ?? ''); }} />
              <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: s.id }, { onSuccess: refresh })}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {(items ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun service. La section utilisera le contenu par défaut.</p>}
      </div>

      <EditDialog
        open={editId !== null}
        onOpenChange={(o) => !o && setEditId(null)}
        title="Modifier le service"
        isSaving={update.isPending}
        canSave={!!eTitle}
        onSave={() =>
          update.mutate({ id: editId!, data: { title: eTitle, description: eDescription, iconUrl: eIconUrl } }, {
            onSuccess: () => { setEditId(null); refresh(); toast({ title: 'Service modifié' }); },
            onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
          })
        }
      >
        <Input placeholder="Titre du service" value={eTitle} onChange={(e) => setETitle(e.target.value)} />
        <Input placeholder="Description" value={eDescription} onChange={(e) => setEDescription(e.target.value)} />
        <UploadField pwd={pwd} value={eIconUrl} onChange={setEIconUrl} label="Icône (image)" />
      </EditDialog>
    </SectionCard>
  );
}

// --------------------------------------------------------
// AVANTAGES (listes « inclus » et carte de prix)
// --------------------------------------------------------
export function FeaturesTab({ pwd }: { pwd: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: items, isLoading } = useListFeatureItems();
  const create = useCreateFeatureItem(adminReq(pwd));
  const update = useUpdateFeatureItem(adminReq(pwd));
  const del = useDeleteFeatureItem(adminReq(pwd));
  const [label, setLabel] = useState('');
  const [section, setSection] = useState<'included' | 'offer'>('included');
  const [editId, setEditId] = useState<number | null>(null);
  const [eLabel, setELabel] = useState('');
  const [eSection, setESection] = useState<'included' | 'offer'>('included');

  const refresh = () => qc.invalidateQueries();

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  const included = (items ?? []).filter((f) => f.section === 'included');
  const offer = (items ?? []).filter((f) => f.section === 'offer');

  const list = (title: string, rows: typeof included) => (
    <div>
      <h4 className="font-semibold text-sm mb-2">{title}</h4>
      <div className="space-y-2">
        {rows.map((f) => (
          <div key={f.id} className="border border-border rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{f.label}</span>
            <div className="flex items-center shrink-0">
              <EditButton onClick={() => { setEditId(f.id); setELabel(f.label); setESection(f.section === 'offer' ? 'offer' : 'included'); }} />
              <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: f.id }, { onSuccess: refresh })}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted-foreground">Aucun élément. La section utilisera le contenu par défaut.</p>}
      </div>
    </div>
  );

  return (
    <SectionCard title="Avantages" desc="Listes « Tout ce qui est inclus dans ton accès » et avantages de la carte de prix">
      <div className="grid md:grid-cols-3 gap-4 p-4 rounded-xl border border-border bg-muted/10 items-center">
        <select
          className="border border-border rounded-md px-3 py-2 text-sm bg-background"
          value={section}
          onChange={(e) => setSection(e.target.value as 'included' | 'offer')}
        >
          <option value="included">Tout ce qui est inclus</option>
          <option value="offer">Carte de prix (offre)</option>
        </select>
        <Input placeholder="Texte de l'avantage" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Button
          disabled={!label || create.isPending}
          onClick={() =>
            create.mutate({ data: { label, section } }, {
              onSuccess: () => { setLabel(''); refresh(); toast({ title: 'Avantage ajouté' }); },
              onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
            })
          }
        >
          {create.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Ajouter
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {list('Tout ce qui est inclus', included)}
        {list('Carte de prix (offre)', offer)}
      </div>

      <EditDialog
        open={editId !== null}
        onOpenChange={(o) => !o && setEditId(null)}
        title="Modifier l'avantage"
        isSaving={update.isPending}
        canSave={!!eLabel}
        onSave={() =>
          update.mutate({ id: editId!, data: { label: eLabel, section: eSection } }, {
            onSuccess: () => { setEditId(null); refresh(); toast({ title: 'Avantage modifié' }); },
            onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
          })
        }
      >
        <select
          className="border border-border rounded-md px-3 py-2 text-sm bg-background w-full"
          value={eSection}
          onChange={(e) => setESection(e.target.value as 'included' | 'offer')}
        >
          <option value="included">Tout ce qui est inclus</option>
          <option value="offer">Carte de prix (offre)</option>
        </select>
        <Input placeholder="Texte de l'avantage" value={eLabel} onChange={(e) => setELabel(e.target.value)} />
      </EditDialog>
    </SectionCard>
  );
}

// --------------------------------------------------------
// VIDÉOS D'AIDE (centre d'aide)
// --------------------------------------------------------
export function HelpVideosTab({ pwd }: { pwd: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: items, isLoading } = useListHelpVideos();
  const create = useCreateHelpVideo(adminReq(pwd));
  const update = useUpdateHelpVideo(adminReq(pwd));
  const del = useDeleteHelpVideo(adminReq(pwd));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eDescription, setEDescription] = useState('');
  const [eVideoUrl, setEVideoUrl] = useState('');

  const refresh = () => qc.invalidateQueries();

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <SectionCard title="Vidéos d'aide" desc="Vidéos de guide affichées sur la page « Centre d'aide »">
      <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/10">
        <Input placeholder="Titre de la vidéo" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input className="md:col-span-2" placeholder="Lien vidéo (YouTube embed, ou fichier envoyé ci-dessous)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        <div className="md:col-span-2">
          <UploadField pwd={pwd} value={videoUrl} onChange={setVideoUrl} label="Ou envoyer un fichier vidéo" accept="video/*" />
        </div>
        <Button
          disabled={!title || !videoUrl || create.isPending}
          onClick={() =>
            create.mutate({ data: { title, description, videoUrl } }, {
              onSuccess: () => { setTitle(''); setDescription(''); setVideoUrl(''); refresh(); toast({ title: 'Vidéo ajoutée' }); },
              onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
            })
          }
        >
          {create.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Ajouter
        </Button>
      </div>

      <div className="space-y-2">
        {(items ?? []).map((v) => (
          <div key={v.id} className="border border-border rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-sm">
            <div className="min-w-0">
              <div className="font-semibold truncate">{v.title}</div>
              <div className="text-xs text-muted-foreground truncate">{v.description} — {v.videoUrl}</div>
            </div>
            <div className="flex items-center shrink-0">
              <EditButton onClick={() => { setEditId(v.id); setETitle(v.title); setEDescription(v.description ?? ''); setEVideoUrl(v.videoUrl); }} />
              <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: v.id }, { onSuccess: refresh })}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {(items ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucune vidéo pour le moment.</p>}
      </div>

      <EditDialog
        open={editId !== null}
        onOpenChange={(o) => !o && setEditId(null)}
        title="Modifier la vidéo d'aide"
        isSaving={update.isPending}
        canSave={!!eTitle && !!eVideoUrl}
        onSave={() =>
          update.mutate({ id: editId!, data: { title: eTitle, description: eDescription, videoUrl: eVideoUrl } }, {
            onSuccess: () => { setEditId(null); refresh(); toast({ title: 'Vidéo modifiée' }); },
            onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
          })
        }
      >
        <Input placeholder="Titre de la vidéo" value={eTitle} onChange={(e) => setETitle(e.target.value)} />
        <Input placeholder="Description" value={eDescription} onChange={(e) => setEDescription(e.target.value)} />
        <Input placeholder="Lien vidéo (YouTube embed, ou fichier envoyé ci-dessous)" value={eVideoUrl} onChange={(e) => setEVideoUrl(e.target.value)} />
        <UploadField pwd={pwd} value={eVideoUrl} onChange={setEVideoUrl} label="Ou envoyer un fichier vidéo" accept="video/*" />
      </EditDialog>
    </SectionCard>
  );
}
