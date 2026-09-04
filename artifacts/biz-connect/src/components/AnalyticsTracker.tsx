import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useCreateAnalyticsEvent } from '@workspace/api-client-react';
import { analyticsEvent, sendLeave } from '@/lib/analytics';

export function AnalyticsTracker() {
  const [path] = useLocation();
  const create = useCreateAnalyticsEvent();
  const started = useRef(Date.now());
  const previousPath = useRef(path);

  useEffect(() => {
    if (path.startsWith('/admin')) return;
    const oldPath = previousPath.current;
    if (!oldPath.startsWith('/admin') && oldPath !== path) sendLeave(oldPath, started.current);
    started.current = Date.now();
    previousPath.current = path;
    create.mutate({ data: analyticsEvent('page_view') });
  }, [path]); // mutation object changes each render; route changes are intentional triggers

  useEffect(() => () => {
    if (!previousPath.current.startsWith('/admin')) sendLeave(previousPath.current, started.current);
  }, []);

  return null;
}