import { Link } from 'wouter';
import { MessageCircle } from 'lucide-react';

export function Navbar() {
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
          <Link
            href="/aide"
            className="btn-blink-gold px-5 py-2 bg-amber-500 text-white font-bold rounded-xl text-sm hover:bg-amber-600 transition-all shadow-sm"
          >
            Guide d'utilisation
          </Link>
        </div>
      </div>
    </header>
  );
}
