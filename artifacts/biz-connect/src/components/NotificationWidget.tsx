import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ~60 prénoms × 26 initiales = 1 560 noms uniques
const FIRST_NAMES = [
  'Jean-Paul', 'Aïssatou', 'Kofi', 'Fatou', 'Mamadou', 'Carine', 'Ibrahim', 'Marie-Claire',
  'Serge', 'Aminata', 'Thierry', 'Aïcha', 'Pape', 'Rosine', 'Abdoulaye', 'Nadège',
  'Yannick', 'Mariam', 'Olivier', 'Bintou', 'Cédric', 'Awa', 'Landry', 'Salimata',
  'Franck', 'Adja', 'Hervé', 'Kadiatou', 'Rodrigue', 'Ramatoulaye', 'Steve', 'Djeneba',
  'Patrick', 'Oumou', 'Éric', 'Hawa', 'Armand', 'Maimouna', 'Boris', 'Assétou',
  'Christian', 'Fanta', 'Didier', 'Korotoumou', 'Alain', 'Sali', 'Junior', 'Néné',
  'Pascal', 'Adama', 'Ismaël', 'Clarisse', 'Moussa', 'Estelle', 'Souleymane', 'Chantal',
  'Blaise', 'Léonie', 'Arnaud', 'Sylvie',
];

const INITIALS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const COUNTRIES = [
  { name: 'Cameroun', flag: '🇨🇲' },
  { name: "Côte d'Ivoire", flag: '🇨🇮' },
  { name: 'Sénégal', flag: '🇸🇳' },
  { name: 'RDC', flag: '🇨🇩' },
  { name: 'Mali', flag: '🇲🇱' },
  { name: 'Gabon', flag: '🇬🇦' },
  { name: 'Togo', flag: '🇹🇬' },
  { name: 'Bénin', flag: '🇧🇯' },
  { name: 'Burkina Faso', flag: '🇧🇫' },
  { name: 'Guinée', flag: '🇬🇳' },
  { name: 'Tchad', flag: '🇹🇩' },
  { name: 'Congo Brazzaville', flag: '🇨🇬' },
  { name: 'Guinée Conakry', flag: '🇬🇳' },
  { name: 'Guinée Bissau', flag: '🇬🇼' },
  { name: 'Niger', flag: '🇳🇪' },
  { name: 'Kenya', flag: '🇰🇪' },
  { name: 'Ghana', flag: '🇬🇭' },
];

// Intervalles variables : 30 s, 1 min, 1 min 30, 2 min
const INTERVALS_MS = [30_000, 60_000, 90_000, 120_000];

const TOTAL = FIRST_NAMES.length * INITIALS.length; // 1560 noms uniques

function shuffle(arr: number[]): number[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function nameAt(index: number): string {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const initial = INITIALS[Math.floor(index / FIRST_NAMES.length)];
  return `${first} ${initial}.`;
}

function makeNotification(index: number) {
  const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  return {
    name: nameAt(index),
    country,
  };
}

export function NotificationWidget() {
  const [current, setCurrent] = useState<ReturnType<typeof makeNotification> | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Paquet mélangé : chaque nom passe une seule fois avant que tout le paquet soit épuisé
  const deckRef = useRef<number[]>([]);
  const posRef = useRef(0);

  useEffect(() => {
    if (dismissed) return;

    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let nextTimer: ReturnType<typeof setTimeout> | undefined;

    const drawNext = () => {
      if (deckRef.current.length === 0 || posRef.current >= TOTAL) {
        deckRef.current = shuffle(Array.from({ length: TOTAL }, (_, i) => i));
        posRef.current = 0;
      }
      const idx = deckRef.current[posRef.current++];
      setCurrent(makeNotification(idx));
      setIsVisible(true);
      // La notification reste affichée 8 secondes
      hideTimer = setTimeout(() => setIsVisible(false), 8_000);
      // Prochaine notification après un délai variable
      const delay = INTERVALS_MS[Math.floor(Math.random() * INTERVALS_MS.length)];
      nextTimer = setTimeout(drawNext, delay);
    };

    // Première notification après 5 secondes
    nextTimer = setTimeout(drawNext, 5_000);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {isVisible && current && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: -50 }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed bottom-5 left-1/2 z-50 flex w-[min(92vw,31rem)] items-center gap-3 rounded-[1.6rem] border border-slate-100 bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.18)] sm:gap-4 sm:px-5 sm:py-5"
        >
          {/* BCA logo */}
          <img src="/logo-bca.png" alt="Biz Connect Academy" className="h-auto w-20 shrink-0 object-contain sm:w-28" />

          <div className="min-w-0 flex-1 pr-7">
            <p className="flex items-center gap-1.5 text-lg font-bold leading-tight text-slate-800 sm:text-2xl">
              <span className="truncate">{current.name}</span>
              <span className="shrink-0 text-xl sm:text-2xl" aria-label={current.country.name}>
                {current.country.flag}
              </span>
            </p>
            <p className="mt-1 text-base font-medium leading-tight text-slate-400 sm:text-xl">
              Vient de s'inscrire
            </p>
          </div>

          <button
            onClick={() => setDismissed(true)}
            aria-label="Fermer la notification"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-300 hover:text-slate-700 transition-colors"
          >
            <X size={30} strokeWidth={1.6} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
