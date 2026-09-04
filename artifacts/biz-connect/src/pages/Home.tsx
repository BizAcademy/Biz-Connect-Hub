import { useState, useEffect, type ReactNode } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  useGetContent, useListTrainings, useListTestimonials,
  useListAmbassadors, useListPartners, useListPaymentMethods,
  useListServices, useListFeatureItems, useListServiceTestimonials, useListFaqs,
} from '@workspace/api-client-react';
import { NotificationWidget } from '@/components/NotificationWidget';
import { Navbar } from '@/components/Navbar';
import { InfiniteSlider } from '@/components/InfiniteSlider';
import { PublicVideo } from '@/components/PublicVideo';
import { TestimonialsAutoSlider } from '@/components/TestimonialsAutoSlider';
import {
  ArrowRight, Users, Globe2, TrendingUp, ShieldCheck,
  Briefcase, GraduationCap, ChevronRight, CheckCircle2, Lock,
  MessageCircle, Star, Award, Zap, Phone
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { trackCtaClick } from '@/lib/analytics';

// Country → flag emoji map
const COUNTRY_FLAGS: Record<string, string> = {
  "Algérie": "🇩🇿", "Bénin": "🇧🇯", "Burkina Faso": "🇧🇫", "Burundi": "🇧🇮",
  "Cameroun": "🇨🇲", "Comores": "🇰🇲", "Congo": "🇨🇬", "Côte d'Ivoire": "🇨🇮",
  "Djibouti": "🇩🇯", "Gabon": "🇬🇦", "Guinée": "🇬🇳", "Guinée-Bissau": "🇬🇼",
  "Madagascar": "🇲🇬", "Mali": "🇲🇱", "Maurice": "🇲🇺", "Mauritanie": "🇲🇷",
  "Maroc": "🇲🇦", "Niger": "🇳🇪", "République Centrafricaine": "🇨🇫",
  "République Démocratique du Congo": "🇨🇩", "Rwanda": "🇷🇼", "Sénégal": "🇸🇳",
  "Seychelles": "🇸🇨", "Tchad": "🇹🇩", "Togo": "🇹🇬", "Tunisie": "🇹🇳",
  "Vanuatu": "🇻🇺", "Congo-Brazzaville": "🇨🇬", "Guinée équatoriale": "🇬🇶",
};

function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else { setCount(Math.floor(start)); }
    }, 16);
    return () => clearInterval(timer);
  }, [end]);
  return <span>{count.toLocaleString()}{suffix}</span>;
}

const fadeIn = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

// Mock gain screenshots data
const GAINS = [
  { name: "Thierry M.", city: "Douala", amount: "487,000 FCFA", days: "12 jours" },
  { name: "Aïcha K.", city: "Abidjan", amount: "1,250,000 FCFA", days: "28 jours" },
  { name: "Pape D.", city: "Dakar", amount: "720,500 FCFA", days: "21 jours" },
  { name: "Rosine A.", city: "Lomé", amount: "340,000 FCFA", days: "9 jours" },
];

const TESTIMONIAL_AMOUNT_PATTERN = /(\d[\d\s.,]*\s?(?:f\s?cfa|fcfa|xaf))/gi;

function renderTestimonialText(text: string) {
  return text.split(TESTIMONIAL_AMOUNT_PATTERN).map((part, index) =>
    /^(?:\d[\d\s.,]*\s?(?:f\s?cfa|fcfa|xaf))$/i.test(part)
      ? <span key={index} className="font-black text-green-600">{part}</span>
      : <span key={index}>{part}</span>
  );
}

function renderGainsSecondaryTitle(title: string) {
  return title.split(/(Biz Connect Academy|téléphone)/gi).map((part, index) => {
    const normalized = part.toLowerCase();
    const color = normalized === 'biz connect academy'
      ? 'text-green-600'
      : normalized === 'téléphone'
        ? 'text-amber-500'
        : '';
    return <span key={`${part}-${index}`} className={color}>{part}</span>;
  });
}

// CTA that supports external URLs (configured in admin) or internal routes
function SignupLink({ href, className, children, analyticsEventName, analyticsMetadata, onClick }: {
  href: string; className?: string; children: ReactNode; analyticsEventName?: string;
  analyticsMetadata?: Record<string, unknown>; onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (analyticsEventName) trackCtaClick(analyticsEventName, analyticsMetadata);
    onClick?.(event);
  };
  if (/^https?:\/\//i.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={handleClick}>{children}</a>;
  }
  return <Link href={href} className={className} onClick={handleClick}>{children}</Link>;
}

export default function Home() {
  const { data: content, isLoading } = useGetContent();
  const { data: trainings } = useListTrainings();
  const { data: testimonials } = useListTestimonials();
  const { data: ambassadors } = useListAmbassadors();
  const { data: partners } = useListPartners();
  const { data: paymentMethods } = useListPaymentMethods();
  const { data: services } = useListServices();
  const { data: featureItems } = useListFeatureItems();
  const { data: serviceTestimonials } = useListServiceTestimonials();
  const { data: faqItems } = useListFaqs();
  const [openServiceId, setOpenServiceId] = useState<number | null>(null);

  if (isLoading || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const memberCountNum = parseInt(content.memberCount.replace(/\D/g, ''), 10) || 13866;
  const countries = content.geoAvailability.split(',').map(c => c.trim()).filter(Boolean);
  const signupUrl = content.signupUrl || '/inscription';
  const lvl1 = parseInt(content.level1Amount.replace(/\D/g, ''), 10) || 1500;
  const lvl2 = parseInt(content.level2Amount.replace(/\D/g, ''), 10) || 500;
  const lvl3 = parseInt(content.level3Amount.replace(/\D/g, ''), 10) || 300;
  const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;
  const offerFeatures = (featureItems ?? []).filter(f => f.section === 'offer');
  const communityImage = content.communityImageUrl || '/membres-bca.jpg';
  const faqs = faqItems && faqItems.length > 0 ? faqItems : [
    { question: "C'est quoi Biz Connect Academy ?", answer: "C'est un réseau d'affaires exclusif pour les entrepreneurs africains. Tu accèdes à un système d'affiliation sur 3 niveaux, un portefeuille digital, une marketplace, et des formations premium gratuites." },
    { question: "Comment fonctionne l'affiliation sur 3 niveaux ?", answer: `Tu touches ${fmt(lvl1)} sur chaque vente directe (Niveau 1), ${fmt(lvl2)} sur les ventes de tes filleuls (Niveau 2), et ${fmt(lvl3)} sur les ventes des filleuls de tes filleuls. Même si tu ne connais pas ces personnes, tu es payé !` },
    { question: "Combien ça coûte pour rejoindre ?", answer: `Un seul tarif : ${content.offerPrice} pour un accès complet à vie à la plateforme, incluant les formations, l'affiliation et le portefeuille digital.` },
    { question: "Quels sont les moyens de paiement acceptés ?", answer: "Mobile Money, Orange Money, MTN Money, Wave, Visa, Mastercard, selon ton pays de résidence." },
    { question: "Ai-je besoin d'expérience pour commencer ?", answer: "Non ! Nos formations intégrées t'accompagnent de A à Z. Même si tu pars de zéro, tu seras guidé pour réussir rapidement." },
    { question: "C'est légal et sécurisé ?", answer: "Oui, Biz Connect Academy est une plateforme légale, enregistrée et opérationnelle au Cameroun et au Bénin. Tous les paiements sont sécurisés." },
  ];

  return (
    <div className="home-emphasis min-h-screen bg-background text-foreground selection:bg-primary/30 font-sans overflow-hidden">

      <Navbar />

      {/* ===== 1. HERO ===== */}
      <section className="relative pt-24 pb-10 lg:pt-28 lg:pb-14 px-6 overflow-hidden bg-white">
        {/* SBC-style floating pastel circles */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-8 w-20 h-20 rounded-full bg-blue-100 opacity-70" />
          <div className="absolute top-32 left-4 w-14 h-14 rounded-full bg-green-100 opacity-60" />
          <div className="absolute top-16 right-12 w-12 h-12 rounded-full bg-primary/10 opacity-80" />
          <div className="absolute bottom-24 right-6 w-16 h-16 rounded-full bg-blue-50 opacity-70" />
          <div className="absolute top-1/2 left-1/3 w-8 h-8 rounded-full bg-primary/10 opacity-50" />
          <div className="absolute bottom-10 left-1/4 w-10 h-10 rounded-full bg-blue-100 opacity-50" />
        </div>

        <div className="container mx-auto relative z-10 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.h1 variants={fadeIn} className="text-3xl lg:text-5xl font-extrabold tracking-tight mb-6 leading-tight text-green-600">
                {content.heroTitle}
              </motion.h1>

              <motion.p variants={fadeIn} className="text-sm lg:text-base text-muted-foreground mb-8 leading-relaxed">
                {content.heroSubtitle}
              </motion.p>

              <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4">
                <SignupLink
                  href={signupUrl}
                  analyticsEventName="Rejoindre Maintenant"
                  analyticsMetadata={{ location: 'hero' }}
                  className="btn-blink px-8 py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 text-base"
                >
                  {content.heroCtaText} <ArrowRight size={20} />
                </SignupLink>
              </motion.div>
            </motion.div>

            {/* Right: Phone mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex items-center justify-center order-first lg:order-none"
            >
              {content.heroImageUrl ? (
                <img
                  src={content.heroImageUrl}
                  alt="Aperçu de l'application BCA"
                  className="max-h-[340px] lg:max-h-[560px] w-auto object-contain drop-shadow-2xl rounded-3xl"
                />
              ) : (
              <div className="relative w-64">
                {/* Phone frame */}
                <div className="w-64 h-[520px] rounded-[3rem] bg-slate-800 border-4 border-slate-700 shadow-2xl overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-12 bg-secondary flex items-center justify-center">
                    <div className="w-24 h-5 rounded-full bg-background/30" />
                  </div>
                  <div className="absolute top-12 inset-x-0 bottom-0 bg-background/5 p-4 flex flex-col gap-3">
                    {/* Fake app UI */}
                    <div className="bg-primary/20 rounded-xl p-3 border border-primary/30">
                      <div className="text-xs text-primary font-bold mb-1">Bénéfice total</div>
                      <div className="text-2xl font-black text-primary">
                        <AnimatedCounter end={1247500} /> FCFA
                      </div>
                      <div className="text-[10px] text-muted-foreground">Ce mois</div>
                    </div>
                    <div className="bg-card rounded-xl p-3 border border-border">
                      <div className="text-[11px] font-bold mb-2 text-foreground">Mes commissions</div>
                      {[
                        { label: "Niveau 1", val: fmt(lvl1), color: "text-amber-400" },
                        { label: "Niveau 2", val: fmt(lvl2), color: "text-zinc-400" },
                        { label: "Niveau 3", val: fmt(lvl3), color: "text-orange-700" },
                      ].map((r, i) => (
                        <div key={i} className="flex justify-between text-[10px] py-0.5">
                          <span className="text-muted-foreground">{r.label}</span>
                          <span className={`font-bold ${r.color}`}>{r.val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-card rounded-xl p-3 border border-border">
                      <div className="text-[11px] font-bold mb-1 text-foreground">Mes services</div>
                      <div className="grid grid-cols-3 gap-2">
                        {["Formations", "Marketplace", "Contacts"].map((s, i) => (
                          <div key={i} className="bg-primary/10 rounded-lg p-2 text-center">
                            <div className="text-[9px] text-primary font-medium">{s}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Floating badge */}
                <div className="absolute -right-4 top-20 bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg">
                  +3,421 filleuls
                </div>
                <div className="absolute -left-4 bottom-20 bg-primary text-primary-foreground text-xs font-bold px-3 py-2 rounded-xl shadow-lg">
                  +13,866 membres
                </div>
              </div>
              )}
            </motion.div>
          </div>

          {/* SECTION PROMOTIONNELLE (si présente) */}
          {(content.promoTitle || content.promoVideoUrl) && (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="mt-12 bg-gradient-to-br from-blue-600 to-blue-500 rounded-3xl p-4 sm:p-8 shadow-2xl text-white relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/30 rounded-full blur-xl transform -translate-x-1/2 translate-y-1/2 pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center text-center">
                {content.promoTitle && (
                  <h2 className="text-2xl sm:text-3xl font-black mb-4 leading-tight shadow-sm">
                    {content.promoTitle.split(/(payé|statut WhatsApp)/gi).map((part, index) => {
                      const normalized = part.toLowerCase();
                      const color = normalized === 'payé'
                        ? 'text-amber-300'
                        : normalized === 'statut whatsapp'
                          ? 'text-lime-300'
                          : '';
                      return <span key={`${part}-${index}`} className={color}>{part}</span>;
                    })}
                  </h2>
                )}
                {content.promoDescription && (
                  <p className="text-sm sm:text-base text-blue-100 mb-6 max-w-3xl leading-relaxed shadow-sm">
                    {content.promoDescription}
                  </p>
                )}

                {content.promoVideoUrl && (
                  <div className="w-full max-w-5xl mb-6 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/10">
                    <PublicVideo
                      url={content.promoVideoUrl}
                      posterUrl={content.promoPosterUrl}
                      title="Vidéo Promotionnelle"
                      className="max-h-[85vh]"
                    />
                  </div>
                )}

                <SignupLink
                  href={signupUrl}
                  analyticsEventName="Je m'inscris maintenant"
                  analyticsMetadata={{ location: 'promo' }}
                  className="btn-blink-gold px-8 py-3.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold rounded-xl shadow-lg transition-colors w-full sm:w-auto text-center"
                >
                  {content.promoCtaText || "Je m'inscris maintenant"}
                </SignupLink>
              </div>
            </motion.div>
          )}

          {/* Vidéo de présentation */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mt-12 max-w-4xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-green-600 mb-2">{content.presentationTitle}</h2>
            <p className="text-muted-foreground text-sm mb-4">Comprenez comment notre plateforme va transformer vos revenus.</p>
            <div className="bg-blue-100 p-2.5 rounded-2xl shadow-xl w-full">
              <PublicVideo url={content.videoUrl} title="Biz Connect Academy — présentation" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== RÉSULTATS — CAPTURES D'ÉCRAN (auto-slider) ===== */}
      <section className="py-8 px-4 bg-background sm:py-14 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-6 sm:mb-8">
            <Award className="w-8 h-8 text-primary mx-auto mb-3 sm:w-10 sm:h-10 sm:mb-4" />
            <h2 className="text-2xl font-bold leading-tight mb-3 uppercase text-green-600 sm:text-3xl">{content.testimonialsTitle}</h2>
          </div>

          {(() => {
            const imgTestimonials = (testimonials ?? []).filter(t => t.mediaType !== 'video');
            if (imgTestimonials.length > 0) {
              return <TestimonialsAutoSlider testimonials={imgTestimonials} />;
            }
            // Fallback : cartes simulées sans ZAPPER
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {GAINS.map((g, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                    className="bg-card border border-border rounded-2xl overflow-hidden shadow-md"
                  >
                    <div className="bg-secondary px-3 py-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                    </div>
                    <div className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">{g.name} · {g.city}</div>
                      <div className="text-base font-black text-green-600">{g.amount}</div>
                      <div className="text-xs text-muted-foreground">en {g.days}</div>
                      <div className="mt-3 h-1.5 bg-primary/20 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${60 + i * 10}%` }} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            );
          })()}

          <div className="text-center mt-10">
            <SignupLink href={signupUrl} analyticsEventName="Je m'inscris maintenant" analyticsMetadata={{ location: 'résultats' }} className="btn-blink inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:scale-105 transition-transform text-base">
              Je m'inscris maintenant <ArrowRight size={18} />
            </SignupLink>
          </div>
        </div>
      </section>

      {/* ===== TÉMOIGNAGES VIDÉO (galerie manuelle + ZAPPER) ===== */}
      {(() => {
        const vidTestimonials = (testimonials ?? []).filter(t => t.mediaType === 'video');
        if (vidTestimonials.length === 0) return null;
        return (
          <section className="py-8 px-4 bg-muted/30 border-t border-border sm:py-12 sm:px-6">
            <div className="container mx-auto max-w-5xl">
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-8 h-8 mx-auto mb-3 sm:w-10 sm:h-10 sm:mb-4 flex items-center justify-center text-primary">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <h2 className="text-2xl font-bold leading-tight mb-1 uppercase text-green-600 sm:text-3xl">
                  Leurs témoignages en vidéo
                </h2>
                <p className="text-sm text-muted-foreground">Glisse pour passer d'une vidéo à l'autre</p>
              </div>

              <div className="flex items-start gap-5 overflow-x-auto snap-x snap-mandatory pb-3" style={{ scrollbarWidth: 'none' }}>
                {vidTestimonials.map((t) => (
                  <div
                    key={t.id}
                    className="h-fit self-start bg-card border border-border rounded-2xl overflow-hidden shadow-[0_8px_0_rgba(30,64,175,0.14),0_18px_30px_rgba(15,23,42,0.18)] flex flex-col shrink-0 w-[calc(100vw-3rem)] max-w-[22rem] snap-center sm:max-w-none sm:w-[32rem]"
                  >
                    {/* Infos */}
                    <div className="p-3 pb-2 sm:p-4 sm:pb-3">
                      <div className="font-bold text-xs leading-snug sm:text-sm">
                        {t.name}
                        {t.country && (
                          <>
                            <span>{` · ${t.country}`}</span>
                            <span className="ml-1" title={`Drapeau du ${t.country}`} aria-label={`Drapeau du ${t.country}`}>
                              {COUNTRY_FLAGS[t.country] ?? '🌍'}
                            </span>
                          </>
                        )}
                      </div>
                      {t.duration && (
                        <div className="text-[11px] text-primary font-semibold sm:text-xs">
                          Résultat en {t.duration}
                        </div>
                      )}
                      {t.text && (
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-5 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-relaxed">
                          {renderTestimonialText(t.text)}
                        </p>
                      )}
                    </div>

                    {/* Vidéo : cadre qui s'adapte au format, bords arrondis + effet 3D */}
                    {t.mediaUrl && (
                      <div className="mx-2 overflow-hidden rounded-xl border border-border/60 bg-black p-1 sm:mx-3">
                        <PublicVideo
                          url={t.mediaUrl}
                          title={`Témoignage de ${t.name}`}
                          className="rounded-xl"
                        />
                      </div>
                    )}

                    {/* ZAPPER */}
                    <div
                      className="flex items-center justify-start gap-2 border-t-2 border-blue-700 bg-blue-600 px-4 py-3 text-left text-sm font-black uppercase tracking-wider text-white shadow-inner"
                      aria-label="Zapper vers la vidéo suivante"
                    >
                      <ArrowRight size={20} strokeWidth={3} aria-hidden="true" />
                      <span>ZAPPER</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ===== 2. STATS BAR ===== */}
      <section className="py-6 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8 text-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
              <div className="text-4xl lg:text-5xl font-black text-primary mb-1">
                +<AnimatedCounter end={memberCountNum} />
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{content.memberCountLabel}</div>
            </motion.div>
            <div className="hidden sm:block w-px h-12 bg-border" />
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
              <div className="text-4xl lg:text-5xl font-black text-foreground mb-1">
                +<AnimatedCounter end={20} />
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pays d'Afrique</div>
            </motion.div>
            <div className="hidden sm:block w-px h-12 bg-border" />
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
              <div className="text-4xl lg:text-5xl font-black text-foreground mb-1">
                <AnimatedCounter end={3} />
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Niveaux de commission</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== 3. GÉOGRAPHIE — slider infini ===== */}
      <section className="py-12 bg-background">
        <div className="container mx-auto max-w-5xl px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-center mb-6">
            {content.countriesIconUrl ? (
              <img
                src={content.countriesIconUrl}
                alt="Pays d'Afrique"
                className="w-36 h-36 object-contain bg-white mx-auto mb-4 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-black/10 transition-transform hover:scale-105"
              />
            ) : (
              <Globe2 className="w-10 h-10 text-primary mx-auto mb-4" />
            )}
            <h2 className="text-3xl font-bold mb-3 text-green-600">{content.countriesTitle}</h2>
            <p className="text-muted-foreground">La BCA est présente dans tous les pays francophones d'Afrique</p>
          </motion.div>
        </div>

        {/* Row 1 — left */}
        <div className="mb-3">
          <InfiniteSlider speed={35} direction="left" gap={12}>
            {countries.slice(0, Math.ceil(countries.length / 2)).map((country, idx) => {
              const flag = COUNTRY_FLAGS[country] ?? '🌍';
              return (
                <div key={idx} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-medium shadow-sm whitespace-nowrap">
                  <span className="text-xl">{flag}</span>
                  <span className="text-xs text-green-600 font-semibold">{country}</span>
                </div>
              );
            })}
          </InfiniteSlider>
        </div>

        {/* Row 2 — right */}
        <div>
          <InfiniteSlider speed={28} direction="right" gap={12}>
            {countries.slice(Math.ceil(countries.length / 2)).map((country, idx) => {
              const flag = COUNTRY_FLAGS[country] ?? '🌍';
              return (
                <div key={idx} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-medium shadow-sm whitespace-nowrap">
                  <span className="text-xl">{flag}</span>
                  <span className="text-xs text-green-600 font-semibold">{country}</span>
                </div>
              );
            })}
          </InfiniteSlider>
        </div>
      </section>

      {/* ===== 4. PHOTO DES MEMBRES (déplacée ici, à la place de la vidéo) ===== */}
      <section className="pt-14 px-6 bg-background">
        <div className="container mx-auto max-w-[84rem]">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="relative">
            <img
              src={communityImage}
              alt="Les membres de la Biz Connect Academy"
              className="w-full object-contain"
            />
            {/* Effet nuage : fondu doux vers le bas de l'image */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background via-background/70 to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* ===== 5. CE QUE TU VAS GAGNER ===== */}
      <section className="py-14 px-6 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-6">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-green-600">
              {content.benefitsTitle}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Un écosystème complet pour faire de ton téléphone un outil de revenus.</p>
          </div>

          {services && services.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((s) => {
                const sTestimonials = (serviceTestimonials ?? []).filter(t => t.serviceId === s.id);
                const isOpen = openServiceId === s.id;
                return (
                <motion.div
                  key={s.id}
                  initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
                  className="relative p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors group"
                >
                  {sTestimonials.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setOpenServiceId(isOpen ? null : s.id)}
                      className="btn-blink absolute top-3 right-3 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-colors z-10"
                    >
                      {isOpen ? 'Fermer' : 'Voir le témoignage'}
                    </button>
                  )}
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 overflow-hidden">
                    {s.iconUrl ? (
                      <img src={s.iconUrl} alt="" className="w-9 h-9 object-contain" />
                    ) : (
                      <Star className="text-primary" size={26} />
                    )}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-green-600">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
                  {isOpen && sTestimonials.length > 0 && (
                    <div className="mt-5 -mx-2 overflow-hidden">
                      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-2 pb-2">
                        {sTestimonials.map((t) => (
                          <div key={t.id} className="snap-start shrink-0 w-48 rounded-xl border border-border bg-background overflow-hidden">
                            {t.mediaType === 'video' ? (
                               <PublicVideo url={t.mediaUrl} className="w-full max-h-64" />
                            ) : (
                              <img src={t.mediaUrl} alt={`Témoignage de ${t.name}`} className="w-full h-40 object-contain bg-muted" />
                            )}
                            <div className="px-3 py-2 text-xs">
                              <span className="font-bold">{t.name}</span>
                              {t.country && (
                                <span className="text-muted-foreground">
                                  {' '}· {COUNTRY_FLAGS[t.country] ? `${COUNTRY_FLAGS[t.country]} ` : ''}{t.country}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
                );
              })}
            </div>
          ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: GraduationCap, title: "Formations Exclusives et Gratuites", desc: "Formations complètes avec suivi personnalisé chaque semaine. Marketing, ventes, mindset business." },
              { icon: TrendingUp, title: "Revenus d'Affiliation", desc: "Gagne de l'argent sur 3 niveaux de commissions. Tes revenus grandissent automatiquement." },
              { icon: Briefcase, title: "Portefeuille Digital", desc: "Expose tes services dans notre marketplace exclusive accessible à toute l'Afrique." },
              { icon: Users, title: "Réseau de +13,866 Entrepreneurs", desc: "Connecte-toi avec des décideurs et des entrepreneurs ambitieux de tout le continent." },
              { icon: Globe2, title: "Visibilité Panafricaine", desc: "Développe ta marque au-delà des frontières dans 29 pays francophones d'Afrique." },
              { icon: ShieldCheck, title: "Plateforme Légale et Sécurisée", desc: "Paiements sécurisés et garantis. Mobile Money, Orange Money, Wave et plus." },
            ].map((b, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
                className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors group"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <b.icon size={26} />
                </div>
                <h3 className="text-lg font-bold mb-2 text-green-600">{b.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* ===== 6. NOS AMBASSADEURS ===== */}
      <section id="ambassadeurs" className="py-14 bg-muted/30 border-y border-border overflow-hidden">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3 uppercase text-green-600">{content.ambassadorsTitle}</h2>
          </div>
        </div>
        {ambassadors && ambassadors.length > 0 ? (
          <InfiniteSlider speed={30} direction="left" gap={24}>
            {ambassadors.map((a) => (
              <div key={a.id} className="w-56 sm:w-64 shrink-0">
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-md">
                  <img src={a.imageUrl} alt={a.name} className="w-full aspect-[3/4] object-contain bg-white" />
                </div>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm">
                  <span className="font-bold">{a.name}</span>
                  {a.country && (
                    <span className="text-muted-foreground">
                      {COUNTRY_FLAGS[a.country] ? `${COUNTRY_FLAGS[a.country]} ` : ''}{a.country}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </InfiniteSlider>
        ) : (
          <p className="text-center text-sm text-muted-foreground px-6">
            Configure tes ambassadeurs depuis le tableau de bord administrateur (onglet « Ambassadeurs »).
          </p>
        )}
      </section>

      {/* ===== 7. GAINS PAR AFFILIATION ===== */}
      <section className="py-14 px-6 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3 text-green-600">{content.gainsTitle}</h2>
            <p className="text-muted-foreground">
              Calcule ce que tu peux gagner en recommandant la{' '}
              <span className="font-semibold text-green-600">Biz Connect Academy</span>
              {' '}à d'autres membres.
            </p>
          </div>

          {content.gainsPosterUrl ? (
            <div className="mb-12">
              <img
                src={content.gainsPosterUrl}
                alt="Tes gains par affiliation"
                className="w-full rounded-2xl border border-border shadow-lg"
              />
            </div>
          ) : (
          <>
          {/* Simulation table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm mb-12">
            <div className="grid grid-cols-4 bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-6 py-3">
              <span>Niveau</span><span>Commission/vente</span><span>10 ventes</span><span>50 ventes</span>
            </div>
            {[
              { lvl: "Niveau 1 (direct)", rate: fmt(lvl1), x10: fmt(lvl1 * 10), x50: fmt(lvl1 * 50), color: "text-amber-400" },
              { lvl: "Niveau 2", rate: fmt(lvl2), x10: fmt(lvl2 * 10), x50: fmt(lvl2 * 50), color: "text-zinc-400" },
              { lvl: "Niveau 3", rate: fmt(lvl3), x10: fmt(lvl3 * 10), x50: fmt(lvl3 * 50), color: "text-orange-700" },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-4 px-6 py-4 border-t border-border text-sm items-center">
                <span className={`font-semibold ${row.color}`}>{row.lvl}</span>
                <span className="font-bold">{row.rate}</span>
                <span>{row.x10}</span>
                <span className="font-bold text-primary">{row.x50}</span>
              </div>
            ))}
          </div>

          <div className="text-center bg-primary/10 border border-primary/30 rounded-2xl px-8 py-6">
            <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="font-bold text-lg">
              Avec 50 ventes à 3 niveaux = <span className="text-primary text-2xl">{fmt((lvl1 + lvl2 + lvl3) * 50)}</span> de commissions
            </p>
            <p className="text-muted-foreground text-sm mt-2">Et tes filleuls travaillent pour toi 24h/24</p>
          </div>
          </>
          )}

          {content.gainsSecondaryImageUrl && (
            <div className="mt-12">
              <h3 className="mb-6 text-center text-2xl font-bold leading-snug text-foreground sm:text-3xl">
                {renderGainsSecondaryTitle(content.gainsSecondaryTitle)}
              </h3>
              <img
                src={content.gainsSecondaryImageUrl}
                alt={content.gainsSecondaryTitle}
                className="w-full rounded-2xl border border-border shadow-lg"
              />
            </div>
          )}
        </div>
      </section>

      {/* ===== 9. OFFRE / PRIX — 2 formules ===== */}
      <section className="py-14 px-6 bg-muted/30 border-y border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3 text-green-600">{content.offerLabel}</h2>
            <p className="text-muted-foreground">Un seul tarif, un accès complet à vie.</p>
          </div>

          <div className="max-w-lg mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
              className="bg-card border-2 border-primary rounded-2xl p-8 relative shadow-2xl text-center"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary text-primary-foreground font-bold rounded-full text-xs uppercase tracking-wide">
                Accès complet
              </div>
              <div className="text-6xl font-black mb-2 mt-2">{content.offerPrice}</div>
              <p className="mb-8 text-sm font-bold text-green-600">Tout ce qui est inclus dans ton accès</p>
              <ul className="space-y-3 mb-8 text-left">
                {(offerFeatures.length > 0
                  ? offerFeatures.map(f => f.label)
                  : [
                      "Accès au réseau BCA",
                      "Système d'affiliation 3 niveaux",
                      "Catalogue de formations premium",
                      "Portefeuille digital",
                      "Support WhatsApp prioritaire",
                      "Outils marketing fournis",
                    ]
                ).map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <SignupLink href={signupUrl} analyticsEventName="Je m'inscris maintenant" analyticsMetadata={{ location: 'tarifs' }} className="btn-blink w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2">
                Je m'inscris maintenant <ArrowRight size={16} />
              </SignupLink>
            </motion.div>
          </div>

        </div>
      </section>

      {/* ===== 11. CATALOGUE FORMATIONS ===== */}
      <section className="py-14 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-bold mb-3 text-green-600">{content.trainingsTitle}</h2>
              <p className="text-muted-foreground max-w-xl">Modules exclusifs pour accélérer ta croissance digitale et financière.</p>
            </div>
            <SignupLink href={signupUrl} analyticsEventName="Voir tout formations" analyticsMetadata={{ location: 'formations' }} className="flex items-center gap-2 text-primary font-bold hover:underline shrink-0">
              Voir tout <ChevronRight size={16} />
            </SignupLink>
          </div>

          {trainings && trainings.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trainings.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-border overflow-hidden group hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 flex flex-col shadow-[0_10px_24px_rgba(15,23,42,0.12)] hover:shadow-[0_18px_34px_rgba(15,23,42,0.2)]"
                >
                  <div className="h-40 bg-white relative overflow-hidden rounded-t-2xl p-1.5">
                    {course.bannerUrl ? (
                      <img
                        src={course.bannerUrl}
                        alt={course.title}
                        className="w-full h-full rounded-xl object-contain transition-transform duration-300 group-hover:-translate-y-0.5 shadow-[0_6px_0_rgba(30,64,175,0.14),0_12px_20px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.9)]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Lock className="text-white/30 w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold mb-4 group-hover:text-primary transition-colors">{course.title}</h3>
                    <a
                      href={course.linkUrl || signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackCtaClick('Accéder maintenant', { trainingTitle: course.title })}
                      className="mt-auto w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      Accéder maintenant <ArrowRight size={16} />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Maîtriser l'Affiliation", cat: "Marketing", time: "2h 30m", lvl: "Débutant" },
              { title: "Facebook & TikTok Ads", cat: "Acquisition", time: "4h 15m", lvl: "Intermédiaire" },
              { title: "Closing Haut de Gamme", cat: "Vente", time: "3h 00m", lvl: "Avancé" },
              { title: "Création de Contenu", cat: "Branding", time: "1h 45m", lvl: "Débutant" },
              { title: "WhatsApp Business Pro", cat: "Vente", time: "2h 10m", lvl: "Intermédiaire" },
              { title: "Mindset Entrepreneur", cat: "Développement", time: "5h 00m", lvl: "Tous niveaux" },
            ].map((course, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                className="bg-card rounded-2xl border border-border overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors"
              >
                <div className="h-36 bg-secondary flex items-center justify-center relative overflow-hidden">
                  <Lock className="text-white/30 w-10 h-10 group-hover:scale-110 transition-transform" />
                  <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 text-white text-[10px] font-bold rounded-full">
                    {course.cat}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold mb-2 group-hover:text-primary transition-colors">{course.title}</h3>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{course.time}</span><span>{course.lvl}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* ===== 13. CTA FINAL ===== */}
      <section className="mx-4 my-8 rounded-3xl border-4 border-white bg-primary px-6 py-14 text-center text-primary-foreground relative overflow-hidden shadow-[0_10px_0_rgba(255,255,255,0.35),0_24px_45px_rgba(15,23,42,0.28)] sm:mx-6 lg:mx-10">
        <div className="container mx-auto max-w-3xl relative z-10">
          <h2 className="text-4xl lg:text-5xl font-black mb-6 leading-tight text-green-300">
            {content.ctaTitle}
          </h2>
          <p className="text-xl mb-10 font-semibold">
            Tu as juste besoin de <span className="font-black">{content.offerPrice}</span> pour créer ton compte
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignupLink href={signupUrl} analyticsEventName="Aujourd'hui je prends la décision de transformer ma vie avec la BCA" analyticsMetadata={{ location: 'cta_final' }} className="btn-blink px-6 py-4 bg-amber-500 text-white font-black rounded-xl shadow-[0_6px_0_rgba(146,64,14,0.45),0_12px_24px_rgba(15,23,42,0.22)] hover:bg-amber-600 hover:scale-105 transition-all w-full sm:w-auto text-sm sm:text-base whitespace-normal break-words leading-snug text-center">
              Aujourd'hui je prends la décision de transformer ma vie avec la BCA
            </SignupLink>
            <Link href="/contact"
              className="px-8 py-4 border-2 border-white text-primary-foreground font-bold rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto text-base"
            >
              <MessageCircle size={20} /> Contacter le support
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 14. FAQ ===== */}
      <section className="py-14 px-6 bg-background border-t border-border">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <Link
                href="/aide"
                className="btn-blink-gold inline-flex items-center gap-2 px-5 py-3 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors"
              >
                Guide d'utilisation BCA <ArrowRight size={17} />
              </Link>
              <Link
                href="/suggestions"
                className="inline-flex items-center gap-2 px-5 py-3 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 transition-colors shadow-lg"
              >
                <MessageCircle size={17} /> Boîte à suggestions
              </Link>
            </div>
            <h2 className="text-3xl font-bold text-green-600">{content.faqTitle}</h2>
          </div>
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={faq.question} value={`item-${i}`} className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary transition-colors">
                <AccordionTrigger className="text-left font-bold text-base hover:no-underline py-5">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5 text-sm">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ===== 15. CONTACT WHATSAPP ===== */}
      <section className="py-10 px-6 bg-muted/30 border-y border-border">
        <div className="container mx-auto max-w-xl text-center">
          <Phone className="w-10 h-10 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-3 text-green-600">{content.supportTitle}</h3>
          <p className="text-muted-foreground mb-6 text-sm">Pour t'aider à t'inscrire et répondre à toutes tes questions.</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors shadow-lg text-base"
          >
            <MessageCircle size={22} /> Contacter le support
          </Link>
        </div>
      </section>

      {/* ===== 16. PARTENAIRES — slider infini ===== */}
      {partners && partners.length > 0 && <section className="py-6 bg-background border-b border-border overflow-hidden">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">{content.partnersTitle}</p>
        <InfiniteSlider speed={31.25} direction="left" gap={48}>
            {partners.map((p) => (
              <img key={p.id} src={p.logoUrl} alt={p.name || 'Partenaire'} className="h-12 w-auto object-contain grayscale hover:grayscale-0 transition-all" />
            ))}
          </InfiniteSlider>
      </section>}

      {/* ===== 17. PAIEMENTS — slider infini ===== */}
      {paymentMethods && paymentMethods.length > 0 && <section className="py-6 bg-muted/30 border-b border-border overflow-hidden">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">{content.paymentMethodsTitle}</p>
          <InfiniteSlider speed={25} direction="left" gap={40}>
            {paymentMethods.map((pm) => (
              <div key={pm.id} className="h-20 w-36 rounded-xl border bg-background p-3 shadow-[0_5px_0_rgba(15,23,42,0.15),0_10px_18px_rgba(15,23,42,0.12)]">
                <img src={pm.logoUrl} alt={pm.name || 'Moyen de paiement'} className="h-full w-full object-contain" />
              </div>
            ))}
          </InfiniteSlider>
      </section>}

      {/* ===== 18. FOOTER ===== */}
      <footer className="py-10 px-6 bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          {/* Logo centré */}
          <img src="/logo-bca-blanc.png" alt="Biz Connect Academy" className="h-16 w-auto object-contain" />
          <p className="text-sm text-slate-400">
            Biz Connect Academy · © {new Date().getFullYear()} Tous droits réservés
          </p>
        </div>
      </footer>

      <NotificationWidget />
    </div>
  );
}
