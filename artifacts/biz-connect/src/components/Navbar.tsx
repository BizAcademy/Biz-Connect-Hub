import { Link } from 'wouter';
import { MessageCircle } from 'lucide-react';
import { useGetContent } from '@workspace/api-client-react';

export function Navbar() {
  const { data: content } = useGetContent();
  const signupUrl = content?.signupUrl || '/inscription';
  const isExternal = /^https?:\/\//i.test(signupUrl);

  const ctaClass = "px-5 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:brightness-105 transition-all shadow-sm";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-6xl">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <img
              src="/logo-bca.png"
              alt="Biz Connect Academy"
              className="w-24 h-24 object-contain"
            />
          </div>
        </Link>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="hidden sm:flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition-colors font-medium"
          >
            <MessageCircle size={16} className="text-green-500" />
            WhatsApp
          </Link>
          {!content ? (
            <span className={`${ctaClass} opacity-60 pointer-events-none`}>S'inscrire</span>
          ) : isExternal ? (
            <a href={signupUrl} target="_blank" rel="noopener noreferrer" className={ctaClass}>
              S'inscrire
            </a>
          ) : (
            <Link href={signupUrl} className={ctaClass}>
              S'inscrire
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
