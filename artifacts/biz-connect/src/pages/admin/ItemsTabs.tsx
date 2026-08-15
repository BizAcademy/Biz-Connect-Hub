import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListTrainings, useCreateTraining, useDeleteTraining,
  useListTestimonials, useCreateTestimonial, useDeleteTestimonial,
  useListPortfolioItems, useCreatePortfolioItem, useDeletePortfolioItem,
  useListPartners, useCreatePartner, useDeletePartner,
  useListPaymentMethods, useCreatePaymentMethod, useDeletePaymentMethod,
  useListServices, useCreateService, useDeleteService,
  useListFeatureItems, useCreateFeatureItem, useDeleteFeatureItem,
  useListHelpVideos, useCreateHelpVideo, useDeleteHelpVideo,
} from '@workspace/api-client-react';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminUpload } from '@/hooks/use-admin-upload';

function adminReq(pwd: string) {
  return { request: { headers: { 'x-admin-password': pwd } } };
}

// Small reusable upload button that returns the stored URL
function UploadField({
  pwd, value, onChange, label, accept = 'image/*',
}: {
  pwd: string;
  value: string;
  onChange: (url: string) => void;
  label: string;
  accept?: string;
}) {
  const { uploadFile, isUploading } = useAdminUpload(pwd);
  const { toast } = useToast();

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm cursor-pointer hover:bg-muted transition-colors">
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isUploading ? 'Envoi en cours…' : 'Choisir un fichier'}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={isUploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = await uploadFile(file);
              if (url) {
                onChange(url);
                toast({ title: 'Fichier envoyé' });
              } else {
                toast({ title: 'Erreur', description: "Échec de l'envoi du fichier", variant: 'destructive' });
              }
              e.target.value = '';
            }}
          />
        </label>
        {value && (
          accept.startsWith('image') ? (
            <img src={value} alt="" className="h-12 rounded-md border border-border object-contain bg-muted" />
          ) : (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{value}</span>
          )
        )}
      </div>
    </div>
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
  const del = useDeleteTraining(adminReq(pwd));
  const [title, setTitle] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

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
              <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: t.id }, { onSuccess: refresh })}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {(items ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucune formation. La section utilisera le contenu par défaut.</p>}
      </div>
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
  const del = useDeleteTestimonial(adminReq(pwd));
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [duration, setDuration] = useState('');
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

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
              <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: t.id }, { onSuccess: refresh })}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {(items ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun témoignage. La section utilisera le contenu par défaut.</p>}
      </div>
    </SectionCard>
  );
}

// --------------------------------------------------------
// GÉNÉRIQUE — listes d'images (portefeuille, partenaires, paiements)
// --------------------------------------------------------
function ImageListTab({
  pwd, title, desc, items, isLoading, onCreate, onDelete, isCreating, withName,
}: {
  pwd: string;
  title: string;
  desc: string;
  items: Array<{ id: number; url: string; label: string }>;
  isLoading: boolean;
  onCreate: (url: string, name: string, done: () => void) => void;
  onDelete: (id: number) => void;
  isCreating: boolean;
  withName?: boolean;
}) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');

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
              <Button variant="ghost" size="icon" onClick={() => onDelete(it.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Aucun élément. La section utilisera le contenu par défaut.</p>}
      </div>
    </SectionCard>
  );
}

export function PortfolioTab({ pwd }: { pwd: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useListPortfolioItems();
  const create = useCreatePortfolioItem(adminReq(pwd));
  const del = useDeletePortfolioItem(adminReq(pwd));

  return (
    <ImageListTab
      pwd={pwd}
      title="Aperçus portefeuille"
      desc="Captures d'écran (téléphone) montrant le portefeuille des membres"
      items={(data ?? []).map((p) => ({ id: p.id, url: p.imageUrl, label: p.caption }))}
      isLoading={isLoading}
      isCreating={create.isPending}
      withName
      onCreate={(url, name, done) =>
        create.mutate({ data: { imageUrl: url, caption: name } }, {
          onSuccess: () => { done(); qc.invalidateQueries(); toast({ title: 'Ajouté' }); },
          onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
        })
      }
      onDelete={(id) => del.mutate({ id }, { onSuccess: () => qc.invalidateQueries() })}
    />
  );
}

export function PartnersTab({ pwd }: { pwd: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useListPartners();
  const create = useCreatePartner(adminReq(pwd));
  const del = useDeletePartner(adminReq(pwd));

  return (
    <ImageListTab
      pwd={pwd}
      title="Partenaires"
      desc="Logos des partenaires affichés dans le slider"
      items={(data ?? []).map((p) => ({ id: p.id, url: p.logoUrl, label: p.name }))}
      isLoading={isLoading}
      isCreating={create.isPending}
      withName
      onCreate={(url, name, done) =>
        create.mutate({ data: { logoUrl: url, name } }, {
          onSuccess: () => { done(); qc.invalidateQueries(); toast({ title: 'Ajouté' }); },
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
  const del = useDeletePaymentMethod(adminReq(pwd));

  return (
    <ImageListTab
      pwd={pwd}
      title="Moyens de paiement"
      desc="Logos des moyens de paiement affichés dans le slider"
      items={(data ?? []).map((p) => ({ id: p.id, url: p.logoUrl, label: p.name }))}
      isLoading={isLoading}
      isCreating={create.isPending}
      withName
      onCreate={(url, name, done) =>
        create.mutate({ data: { logoUrl: url, name } }, {
          onSuccess: () => { done(); qc.invalidateQueries(); toast({ title: 'Ajouté' }); },
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
  const del = useDeleteService(adminReq(pwd));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');

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
            <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: s.id }, { onSuccess: refresh })}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        {(items ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun service. La section utilisera le contenu par défaut.</p>}
      </div>
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
  const del = useDeleteFeatureItem(adminReq(pwd));
  const [label, setLabel] = useState('');
  const [section, setSection] = useState<'included' | 'offer'>('included');

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
            <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: f.id }, { onSuccess: refresh })}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
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
  const del = useDeleteHelpVideo(adminReq(pwd));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

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
            <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: v.id }, { onSuccess: refresh })}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        {(items ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucune vidéo pour le moment.</p>}
      </div>
    </SectionCard>
  );
}
