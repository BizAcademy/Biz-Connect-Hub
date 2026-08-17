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

// Pays + drapeaux (mêmes pays qu'actuellement)
const COUNTRIES = ['🇨🇲', '🇸🇳', '🇨🇮', '🇲🇱', '🇬🇦', '🇹🇬', '🇨🇬', '🇧🇯', '🇬🇳', '🇧🇫', '🇳🇪', '🇹🇩', '🇨🇩', '🇲🇬', '🇲🇦', '🇩🇿', '🇹🇳', '🇷🇼', '🇲🇷', '🇩🇯'];

const ACTIONS = ["vient de s'inscrire", 'vient de rejoindre le réseau'];

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
  return {
    name: `${nameAt(index)} ${COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)]}`,
    action: ACTIONS[Math.floor(Math.random() * ACTIONS.length)],
    time: `il y a ${1 + Math.floor(Math.random() * 29)} min`,
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
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20, x: -20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed bottom-2 left-2 z-50 flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1.5 shadow-lg w-max max-w-[220px]"
        >
          {/* BCA logo */}
          <img src="/logo-bca.png" alt="BCA" className="w-4 h-4 object-contain shrink-0" />

          <div className="flex-1 min-w-0 pr-3">
            <p className="!text-[10px] !font-normal text-slate-800 leading-tight break-words">
              {current.name}
            </p>
            <p className="!text-[9px] !font-normal text-slate-500 mt-0.5 leading-tight break-words">
              {current.action} · {current.time}
            </p>
          </div>

          <button
            onClick={() => setDismissed(true)}
            aria-label="Fermer la notification"
            className="absolute right-0 top-0 p-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={8} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
