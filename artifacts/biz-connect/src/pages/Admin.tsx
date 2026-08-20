import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  useVerifyAdmin, useListLeads, useGetLeadsStats, useExportLeads,
  useGetContent, useUpdateContent 
} from '@workspace/api-client-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { Download, Loader2, Save, LogOut } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainingsTab, TestimonialsTab, AmbassadorsTab, PartnersTab, PaymentsTab, ServicesTab, FeaturesTab, HelpVideosTab } from '@/pages/admin/ItemsTabs';
import { MediaTab } from '@/pages/admin/MediaTab';
import { useCloudinaryUpload } from '@/hooks/use-cloudinary-upload';
import { Upload } from 'lucide-react';

// Auth Form Schema
const authSchema = z.object({
  password: z.string().min(1, "Mot de passe requis"),
});

// Content Form Schema
const contentSchema = z.object({
  heroTitle: z.string().min(1),
  heroSubtitle: z.string().min(1),
  heroCtaText: z.string().min(1),
  memberCount: z.string().min(1),
  memberCountLabel: z.string().min(1),
  geoAvailability: z.string().min(1),
  promoTitle: z.string(),
  promoDescription: z.string(),
  promoVideoUrl: z.string(),
  promoPosterUrl: z.string(),
  promoCtaText: z.string(),
  videoUrl: z.string().min(1),
  offerPrice: z.string().min(1),
  offerOriginalPrice: z.string().min(1),
  offerLabel: z.string().min(1),
  level1Name: z.string().min(1),
  level1Amount: z.string().min(1),
  level2Name: z.string().min(1),
  level2Amount: z.string().min(1),
  level3Name: z.string().min(1),
  level3Amount: z.string().min(1),
  whatsappNumber: z.string().min(1),
  heroImageUrl: z.string(),
  signupUrl: z.string().min(1),
  communityImageUrl: z.string(),
  countriesIconUrl: z.string(),
  gainsPosterUrl: z.string(),
  gainsSecondaryImageUrl: z.string(),
  telegramLink: z.string(),
  supportPhone1: z.string(),
  supportPhone2: z.string(),
});

// Champ d'upload d'image réutilisable pour le formulaire de contenu
function ImageUploadField({
  form, name, label, uploadFile, isUploading,
}: {
  form: ReturnType<typeof useForm<z.infer<typeof contentSchema>>>;
  name: 'communityImageUrl' | 'countriesIconUrl' | 'gainsPosterUrl' | 'gainsSecondaryImageUrl' | 'promoPosterUrl';
  label: string;
  uploadFile: (file: File, opts?: { removeBackground?: boolean }) => Promise<string | null>;
  isUploading: boolean;
}) {
  const { toast } = useToast();
  const [removeBg, setRemoveBg] = useState(false);
  const value = form.watch(name);
  return (
    <div className="col-span-2 space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm cursor-pointer hover:bg-muted transition-colors">
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isUploading ? 'Envoi en cours…' : 'Choisir une image'}
          <input type="file" accept="image/*" className="hidden" disabled={isUploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = await uploadFile(file, { removeBackground: removeBg });
              if (url) {
                form.setValue(name, url, { shouldDirty: true });
                toast({ title: 'Image envoyée', description: "N'oubliez pas d'enregistrer." });
              } else {
                toast({ title: 'Erreur', description: "Échec de l'envoi", variant: 'destructive' });
              }
              e.target.value = '';
            }}
          />
        </label>
        {value && <img src={value} alt="Aperçu" className="h-20 rounded-md border border-border object-contain bg-muted" />}
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue(name, '', { shouldDirty: true })}>
            Retirer
          </Button>
        )}
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          className="accent-primary"
          checked={removeBg}
          onChange={(e) => setRemoveBg(e.target.checked)}
        />
        Supprimer le fond (image détourée, qualité conservée)
      </label>
    </div>
  );
}

export default function Admin() {
  const [password, setPassword] = useState<string | null>(() => sessionStorage.getItem('admin_pwd'));
  const { toast } = useToast();

  if (!password) {
    return <AdminLogin onLogin={(pwd) => {
      sessionStorage.setItem('admin_pwd', pwd);
      setPassword(pwd);
    }} />;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-foreground">Biz Connect Admin</h1>
        <Button variant="ghost" onClick={() => {
          sessionStorage.removeItem('admin_pwd');
          setPassword(null);
        }}>
          <LogOut className="w-4 h-4 mr-2" /> Déconnexion
        </Button>
      </header>

      <main className="container mx-auto p-6 max-w-7xl">
        <Tabs defaultValue="leads" className="w-full">
          <TabsList className="flex w-full flex-wrap h-auto gap-1 mb-8">
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="trainings">Formations</TabsTrigger>
            <TabsTrigger value="testimonials">Témoignages</TabsTrigger>
            <TabsTrigger value="ambassadors">Ambassadeurs</TabsTrigger>
            <TabsTrigger value="partners">Partenaires</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="features">Avantages</TabsTrigger>
            <TabsTrigger value="helpvideos">Vidéos d'aide</TabsTrigger>
            <TabsTrigger value="media">Médias</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <LeadsTab pwd={password} />
          </TabsContent>

          <TabsContent value="stats">
            <StatsTab pwd={password} />
          </TabsContent>

          <TabsContent value="content">
            <ContentTab pwd={password} />
          </TabsContent>

          <TabsContent value="trainings">
            <TrainingsTab pwd={password} />
          </TabsContent>

          <TabsContent value="testimonials">
            <TestimonialsTab pwd={password} />
          </TabsContent>

          <TabsContent value="ambassadors">
            <AmbassadorsTab pwd={password} />
          </TabsContent>

          <TabsContent value="partners">
            <PartnersTab pwd={password} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTab pwd={password} />
          </TabsContent>

          <TabsContent value="services">
            <ServicesTab pwd={password} />
          </TabsContent>

          <TabsContent value="features">
            <FeaturesTab pwd={password} />
          </TabsContent>

          <TabsContent value="helpvideos">
            <HelpVideosTab pwd={password} />
          </TabsContent>

          <TabsContent value="media">
            <MediaTab pwd={password} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// --------------------------------------------------------
// ADMIN LOGIN COMPONENT
// --------------------------------------------------------
function AdminLogin({ onLogin }: { onLogin: (pwd: string) => void }) {
  const verify = useVerifyAdmin();
  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { password: "" }
  });
  const { toast } = useToast();

  const onSubmit = (values: z.infer<typeof authSchema>) => {
    verify.mutate({ data: values }, {
      onSuccess: (res) => {
        if (res.valid) {
          onLogin(values.password);
        } else {
          toast({ title: "Erreur", description: "Mot de passe incorrect", variant: "destructive" });
        }
      },
      onError: () => {
        toast({ title: "Erreur", description: "Erreur de connexion", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Administration</CardTitle>
          <CardDescription>Accès sécurisé réservé à la direction</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={verify.isPending}>
                {verify.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Se connecter
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// --------------------------------------------------------
// LEADS TAB COMPONENT
// --------------------------------------------------------
function LeadsTab({ pwd }: { pwd: string }) {
  const { data: leads, isLoading } = useListLeads({ 
    query: { queryKey: ["leads", pwd] },
    request: { headers: { 'x-admin-password': pwd } }
  });
  const { refetch: exportData, isFetching: isExporting } = useExportLeads({
    query: { enabled: false, queryKey: ["export", pwd] },
    request: { headers: { 'x-admin-password': pwd } }
  });

  const handleExport = async () => {
    const res = await exportData();
    if (res.data) {
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Liste des Prospects</CardTitle>
          <CardDescription>Tous les contacts capturés sur la landing page</CardDescription>
        </div>
        <Button onClick={handleExport} disabled={isExporting} variant="outline">
          {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} 
          Exporter CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Ville</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!leads || leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    Aucun lead pour le moment.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {format(new Date(lead.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell>{lead.name}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>{lead.city}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------
// STATS TAB COMPONENT
// --------------------------------------------------------
function StatsTab({ pwd }: { pwd: string }) {
  const { data: stats, isLoading } = useGetLeadsStats({
    query: { queryKey: ["stats", pwd] },
    request: { headers: { 'x-admin-password': pwd } }
  });

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  const chartData = stats?.byDay.map(day => ({
    name: format(new Date(day.date), 'dd MMM', { locale: fr }),
    Inscriptions: day.count
  })) || [];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Total Leads</CardTitle>
          <CardDescription>Volume global généré</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-black text-primary">
            {stats?.total || 0}
          </div>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Inscriptions par jour</CardTitle>
          <CardDescription>Les 30 derniers jours</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 8 }}
                />
                <Bar dataKey="Inscriptions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">Pas de données</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --------------------------------------------------------
// CONTENT TAB COMPONENT
// --------------------------------------------------------
function ContentTab({ pwd }: { pwd: string }) {
  const [removeBgHero, setRemoveBgHero] = useState(false);
  const { data: content, isLoading } = useGetContent();
  const updateContent = useUpdateContent({ request: { headers: { 'x-admin-password': pwd } } });
  const { toast } = useToast();
  const { uploadFile: uploadMedia, isUploading } = useCloudinaryUpload(pwd);
  const isUploadingVideo = isUploading;
  const uploadVideo = uploadMedia;
  // Toutes les images/vidéos du formulaire de contenu passent par Cloudinary
  const uploadFile = async (
    file: File,
    opts?: { removeBackground?: boolean },
  ): Promise<string | null> => (await uploadMedia(file, opts))?.url ?? null;

  const form = useForm<z.infer<typeof contentSchema>>({
    resolver: zodResolver(contentSchema),
  });

  useEffect(() => {
    if (content) {
      form.reset(content);
    }
  }, [content, form]);

  const onSubmit = (values: z.infer<typeof contentSchema>) => {
    updateContent.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Succès", description: "Le contenu a été mis à jour" });
      },
      onError: () => {
        toast({ title: "Erreur", description: "Impossible de mettre à jour le contenu", variant: "destructive" });
      }
    });
  };

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Éditeur de contenu</CardTitle>
        <CardDescription>Modifiez les textes affichés sur la landing page</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6 p-6 rounded-xl border border-border bg-muted/10">
              <div className="col-span-2"><h3 className="font-bold text-lg mb-2">Section Hero</h3></div>
              <FormField control={form.control} name="heroTitle" render={({ field }) => (
                <FormItem><FormLabel>Titre Principal</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="heroSubtitle" render={({ field }) => (
                <FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="heroCtaText" render={({ field }) => (
                <FormItem><FormLabel>Texte Bouton CTA</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="signupUrl" render={({ field }) => (
                <FormItem><FormLabel>Lien du bouton « Je m'inscris » (URL externe ou /inscription)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <div className="col-span-2 space-y-2">
                <Label>Image du téléphone (Hero)</Label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm cursor-pointer hover:bg-muted transition-colors">
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {isUploading ? 'Envoi en cours…' : 'Choisir une image'}
                    <input type="file" accept="image/*" className="hidden" disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadFile(file, { removeBackground: removeBgHero });
                        if (url) {
                          form.setValue('heroImageUrl', url, { shouldDirty: true });
                          toast({ title: 'Image envoyée', description: "N'oubliez pas d'enregistrer." });
                        } else {
                          toast({ title: 'Erreur', description: "Échec de l'envoi", variant: 'destructive' });
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {form.watch('heroImageUrl') && (
                    <img src={form.watch('heroImageUrl')} alt="Aperçu" className="h-20 rounded-md border border-border object-contain bg-muted" />
                  )}
                  {form.watch('heroImageUrl') && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue('heroImageUrl', '', { shouldDirty: true })}>
                      Retirer
                    </Button>
                  )}
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={removeBgHero}
                    onChange={(e) => setRemoveBgHero(e.target.checked)}
                  />
                  Supprimer le fond (image détourée, qualité conservée)
                </label>
              </div>
              <ImageUploadField form={form} name="communityImageUrl" label="Image des membres (sous le bouton d'inscription)" uploadFile={uploadFile} isUploading={isUploading} />
              <ImageUploadField form={form} name="countriesIconUrl" label="Icône de la section « Disponible dans X pays »" uploadFile={uploadFile} isUploading={isUploading} />
            </div>

            <div className="grid md:grid-cols-2 gap-6 p-6 rounded-xl border border-border bg-muted/10">
              <div className="col-span-2"><h3 className="font-bold text-lg mb-2">Section Promotionnelle (Optionnelle)</h3></div>
              <FormField control={form.control} name="promoTitle" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Titre de la promotion</FormLabel><FormControl><Input {...field} placeholder="Ex: Sois payé pour publier du contenu sur ton statut WhatsApp" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="promoDescription" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Description</FormLabel><FormControl><Input {...field} placeholder="Ex: Avec la nouvelle fonctionnalité..." /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="promoCtaText" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Texte Bouton CTA</FormLabel><FormControl><Input {...field} placeholder="Ex: Je m'inscris maintenant" /></FormControl></FormItem>
              )} />

              <div className="col-span-2 space-y-2">
                <Label>Vidéo Promotionnelle</Label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm cursor-pointer hover:bg-muted transition-colors">
                    {isUploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {isUploadingVideo ? 'Envoi en cours…' : 'Uploader une vidéo'}
                    <input type="file" accept="video/*" className="hidden" disabled={isUploadingVideo}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const media = await uploadVideo(file);
                        if (media) {
                          form.setValue('promoVideoUrl', media.url, { shouldDirty: true });
                          toast({ title: 'Vidéo envoyée', description: "N'oubliez pas d'enregistrer." });
                        } else {
                          toast({ title: 'Erreur', description: "Échec de l'envoi de la vidéo", variant: 'destructive' });
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {form.watch('promoVideoUrl') && !/youtube\.com|youtu\.be|vimeo\.com/.test(form.watch('promoVideoUrl')) && (
                    <video src={form.watch('promoVideoUrl')} className="h-24 rounded-md border border-border bg-black" controls preload="metadata" />
                  )}
                </div>
                <FormField control={form.control} name="promoVideoUrl" render={({ field }) => (
                  <FormItem><FormControl><Input {...field} placeholder="…ou collez une URL de vidéo" /></FormControl></FormItem>
                )} />
              </div>

              <ImageUploadField form={form} name="promoPosterUrl" label="Bannière d'aperçu de la vidéo (Image)" uploadFile={uploadFile} isUploading={isUploading} />
            </div>

            <div className="grid md:grid-cols-2 gap-6 p-6 rounded-xl border border-border bg-muted/10">
              <div className="col-span-2"><h3 className="font-bold text-lg mb-2">Chiffres & Geo</h3></div>
              <FormField control={form.control} name="memberCount" render={({ field }) => (
                <FormItem><FormLabel>Nombre de membres</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="memberCountLabel" render={({ field }) => (
                <FormItem><FormLabel>Label compteur</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="geoAvailability" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Pays (séparés par virgule)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
            </div>

            <div className="grid md:grid-cols-2 gap-6 p-6 rounded-xl border border-border bg-muted/10">
              <div className="col-span-2"><h3 className="font-bold text-lg mb-2">Offre & Prix</h3></div>
              <FormField control={form.control} name="offerPrice" render={({ field }) => (
                <FormItem><FormLabel>Prix Actuel</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="offerOriginalPrice" render={({ field }) => (
                <FormItem><FormLabel>Prix Barré (Original)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="offerLabel" render={({ field }) => (
                <FormItem><FormLabel>Label de l'offre (ex: Inscriptions à vie)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <ImageUploadField form={form} name="gainsPosterUrl" label="Affiche « Tes gains par affiliation » (remplace le tableau des gains)" uploadFile={uploadFile} isUploading={isUploading} />
              <ImageUploadField form={form} name="gainsSecondaryImageUrl" label="Seconde image « Ton téléphone travaille pour toi » (affichée sous l'affiche des gains)" uploadFile={uploadFile} isUploading={isUploading} />
            </div>

            <div className="grid md:grid-cols-2 gap-6 p-6 rounded-xl border border-border bg-muted/10">
              <div className="col-span-2"><h3 className="font-bold text-lg mb-2">Affiliation (Niveaux)</h3></div>
              <FormField control={form.control} name="level1Name" render={({ field }) => (
                <FormItem><FormLabel>Niveau 1 - Nom</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="level1Amount" render={({ field }) => (
                <FormItem><FormLabel>Niveau 1 - Montant</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="level2Name" render={({ field }) => (
                <FormItem><FormLabel>Niveau 2 - Nom</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="level2Amount" render={({ field }) => (
                <FormItem><FormLabel>Niveau 2 - Montant</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="level3Name" render={({ field }) => (
                <FormItem><FormLabel>Niveau 3 - Nom</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="level3Amount" render={({ field }) => (
                <FormItem><FormLabel>Niveau 3 - Montant</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
            </div>

            <div className="grid md:grid-cols-2 gap-6 p-6 rounded-xl border border-border bg-muted/10">
              <div className="col-span-2"><h3 className="font-bold text-lg mb-2">Médias & Contact</h3></div>
              <div className="col-span-2 space-y-2">
                <Label>Vidéo de présentation (page d'accueil)</Label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm cursor-pointer hover:bg-muted transition-colors">
                    {isUploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {isUploadingVideo ? 'Envoi en cours…' : 'Uploader une vidéo'}
                    <input type="file" accept="video/*" className="hidden" disabled={isUploadingVideo}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const media = await uploadVideo(file);
                        if (media) {
                          form.setValue('videoUrl', media.url, { shouldDirty: true });
                          toast({ title: 'Vidéo envoyée', description: "N'oubliez pas d'enregistrer." });
                        } else {
                          toast({ title: 'Erreur', description: "Échec de l'envoi de la vidéo", variant: 'destructive' });
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {form.watch('videoUrl') && !/youtube\.com|youtu\.be|vimeo\.com/.test(form.watch('videoUrl')) && (
                    <video src={form.watch('videoUrl')} className="h-24 rounded-md border border-border bg-black" controls preload="metadata" />
                  )}
                </div>
                <FormField control={form.control} name="videoUrl" render={({ field }) => (
                  <FormItem><FormControl><Input {...field} placeholder="…ou collez une URL de vidéo" /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="whatsappNumber" render={({ field }) => (
                <FormItem><FormLabel>Numéro WhatsApp (avec indicatif)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="supportPhone1" render={({ field }) => (
                <FormItem><FormLabel>Page contact — Numéro support 1</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="supportPhone2" render={({ field }) => (
                <FormItem><FormLabel>Page contact — Numéro support 2</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="telegramLink" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Lien Telegram (page contact)</FormLabel><FormControl><Input {...field} placeholder="https://t.me/..." /></FormControl></FormItem>
              )} />
            </div>

            <Button type="submit" disabled={updateContent.isPending}>
              {updateContent.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Enregistrer les modifications
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}