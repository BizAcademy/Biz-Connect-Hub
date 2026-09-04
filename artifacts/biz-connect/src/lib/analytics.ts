import type { AnalyticsEventInput } from '@workspace/api-client-react';

const VISITOR_KEY = 'bca_analytics_visitor';
const SESSION_KEY = 'bca_analytics_session';

function id(storage: Storage, key: string) {
  let value = storage.getItem(key);
  if (!value) {
    value = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    storage.setItem(key, value);
  }
  return value;
}

export function analyticsIdentity() {
  return { visitorId: id(localStorage, VISITOR_KEY), sessionId: id(sessionStorage, SESSION_KEY) };
}

export function analyticsEvent(eventType: AnalyticsEventInput['eventType'], eventName?: string, metadata?: Record<string, unknown>, durationSeconds?: number): AnalyticsEventInput {
  return { ...analyticsIdentity(), eventType, eventName, path: window.location.pathname, metadata, durationSeconds };
}

/** CTA names and dimensions are deliberately product-only: no personal data is collected. */
export function trackCtaClick(eventName: string, metadata?: Record<string, unknown>) {
  const payload = analyticsEvent('cta_click', eventName, metadata);
  void fetch('/api/analytics/events', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true,
  }).catch(() => undefined);
}

export function sendLeave(path: string, startedAt: number) {
  const payload = analyticsEvent('page_leave', undefined, undefined, Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
  payload.path = path;
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/events', new Blob([body], { type: 'application/json' }));
    return;
  }
  void fetch('/api/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
}