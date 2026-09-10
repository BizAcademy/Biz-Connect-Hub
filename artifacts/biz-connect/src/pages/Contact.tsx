import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Copy, Check, Phone } from 'lucide-react';
import { FaFacebookF, FaInstagram, FaTelegramPlane, FaTiktok, FaWhatsapp, FaYoutube } from 'react-icons/fa';
import { useGetContent } from '@workspace/api-client-react';
import { Navbar } from '@/components/Navbar';

function PhoneCard({ label, number }: { label: string; number: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — show the number anyway
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
          <Phone size={22} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-lg font-black truncate">{number}</div>
        </div>
      </div>
      <button
        onClick={copy}
        className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
          copied ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:brightness-110'
        }`}
      >
        {copied ? <><Check size={16} /> Copié !</> : <><Copy size={16} /> Copier</>}
      </button>
    </div>
  );
}

export default function Contact() {
  const { data: content, isLoading } = useGetContent();

  if (isLoading || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const phone1 = content.supportPhone1 || content.whatsappNumber;
  const phone2 = content.supportPhone2;
  const socialLinks = [
    { label: 'Facebook', href: content.facebookLink, icon: FaFacebookF, className: 'bg-[#1877F2] hover:bg-[#1669d5]' },
    { label: 'TikTok', href: content.tiktokLink, icon: FaTiktok, className: 'bg-black hover:bg-zinc-800' },
    { label: 'Instagram', href: content.instagramLink, icon: FaInstagram, className: 'bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] hover:brightness-110' },
    { label: 'YouTube', href: content.youtubeLink, icon: FaYoutube, className: 'bg-[#FF0000] hover:bg-[#d90000]' },
    { label: 'Canal Telegram', href: content.telegramLink, icon: FaTelegramPlane, className: 'bg-[#229ED9] hover:bg-[#1c8abb]' },
    { label: 'Chaîne WhatsApp', href: content.whatsappChannelLink, icon: FaWhatsapp, className: 'bg-[#25D366] hover:bg-[#20b858]' },
  ].filter((item) => item.href);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="pt-28 pb-20 px-6">
        <div className="container mx-auto max-w-xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft size={16} /> Retour à l'accueil
          </Link>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-3">Contacter le support</h1>
            <p className="text-muted-foreground text-sm">
              Copie l'un de ces numéros et enregistre-le dans tes contacts pour échanger avec le support sur WhatsApp.
            </p>
          </div>

          <div className="space-y-4 mb-10">
            {phone1 && <PhoneCard label="Support — Numéro 1" number={phone1} />}
            {phone2 && <PhoneCard label="Support — Numéro 2" number={phone2} />}
            {!phone1 && !phone2 && (
              <div className="text-center py-10 bg-card border border-border rounded-2xl text-muted-foreground text-sm">
                Les numéros du support seront bientôt disponibles.
              </div>
            )}
          </div>

          {socialLinks.length > 0 && (
            <div>
              <div className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                Retrouve-nous sur nos réseaux
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {socialLinks.map(({ label, href, icon: Icon, className }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center gap-3 px-5 py-3.5 text-white font-bold rounded-xl transition-all shadow-md hover:-translate-y-0.5 ${className}`}
                  >
                    <Icon size={20} /> {label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
