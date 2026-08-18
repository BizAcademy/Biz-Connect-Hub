import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, PlayCircle } from 'lucide-react';
import { useListHelpVideos, useGetContent } from '@workspace/api-client-react';
import { Navbar } from '@/components/Navbar';

// Bouton d'inscription (gère les liens externes configurés dans l'admin)
function SignupButton({ href }: { href: string }) {
  const cls = "btn-blink-soft inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-sm";
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        S'inscrire maintenant <ArrowRight size={15} />
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      S'inscrire maintenant <ArrowRight size={15} />
    </Link>
  );
}

// Convertit les URLs YouTube/Vimeo classiques en URLs intégrables (embed)
function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const dm = url.match(/dailymotion\.com\/(?:video|embed\/video)\/([A-Za-z0-9]+)/i);
  if (dm) return `https://www.dailymotion.com/embed/video/${dm[1]}`;
  return null;
}

function VideoPlayer({ url, title }: { url: string; title: string }) {
  const embedUrl = toEmbedUrl(url);
  if (embedUrl) {
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }
  return <video src={url} controls className="w-full rounded-xl bg-black aspect-video" />;
}

export default function Aide() {
  const { data: videos, isLoading } = useListHelpVideos();
  const { data: content } = useGetContent();
  const signupUrl = content?.signupUrl || '/inscription';

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="pt-28 pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft size={16} /> Retour à l'accueil
          </Link>

          <div className="text-center mb-12">
            <PlayCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl lg:text-4xl font-bold mb-3">Centre d'aide</h1>
            <p className="text-muted-foreground">
              Des vidéos de guide pour t'accompagner pas à pas dans l'utilisation de la plateforme.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : videos && videos.length > 0 ? (
            <div className="space-y-10">
              {videos.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-6 shadow-sm"
                >
                  <h2 className="text-xl font-bold mb-2">{v.title}</h2>
                  {v.description && <p className="text-muted-foreground text-sm mb-4">{v.description}</p>}
                  <VideoPlayer url={v.videoUrl} title={v.title} />
                  <div className="mt-4 text-center">
                    <SignupButton href={signupUrl} />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card border border-border rounded-2xl">
              <p className="text-muted-foreground">
                Les vidéos de guide seront bientôt disponibles. Reviens un peu plus tard !
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
