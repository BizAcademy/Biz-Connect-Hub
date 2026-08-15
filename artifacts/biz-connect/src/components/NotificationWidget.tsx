import { useState, useEffect } from 'react';
import { useGetNotifications, getGetNotificationsQueryKey } from '@workspace/api-client-react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationWidget() {
  const { data: notifications } = useGetNotifications({ query: { refetchInterval: 30000, queryKey: getGetNotificationsQueryKey() } });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed || !notifications || notifications.length === 0) {
      setIsVisible(false);
      return;
    }

    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    const cycleTimer = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % notifications.length);
        setIsVisible(true);
      }, 500);
    }, 8000);

    return () => {
      clearTimeout(showTimer);
      clearInterval(cycleTimer);
    };
  }, [notifications, dismissed]);

  if (dismissed || !notifications || notifications.length === 0) return null;

  const n = notifications[currentIndex];

  return (
    <AnimatePresence>
      {isVisible && n && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: -50 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20, x: -20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-xl max-w-[240px]"
        >
          {/* BCA logo */}
          <img src="/logo-bca.png" alt="BCA" className="w-7 h-7 object-contain shrink-0" />

          <div className="flex-1 min-w-0 pr-3">
            <p className="text-xs font-bold text-slate-800 leading-tight truncate">
              {n.name}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {n.action} · {n.time}
            </p>
          </div>

          <button
            onClick={() => setDismissed(true)}
            aria-label="Fermer la notification"
            className="absolute right-0 top-0 p-2 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={12} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
