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
          className="fixed bottom-2 left-2 z-50 flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-1 shadow-lg w-max max-w-[calc(100vw-1rem)]"
        >
          {/* BCA logo */}
          <img src="/logo-bca.png" alt="BCA" className="w-3.5 h-3.5 object-contain shrink-0" />

          <div className="flex-1 pr-2">
            <p className="text-[8px] font-normal text-slate-800 leading-tight whitespace-nowrap">
              {n.name}
            </p>
            <p className="text-[7px] text-slate-500 mt-0.5 leading-tight whitespace-nowrap">
              {n.action} · {n.time}
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
