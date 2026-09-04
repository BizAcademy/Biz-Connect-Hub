import { useEffect } from 'react';
import { useLocation } from 'wouter';

const SITE_URL = 'https://presentationbizconnectacademy.com';

const pages: Record<string, { title: string; description: string; index?: boolean }> = {
  '/': {
    title: 'Biz Connect Academy | Formation et réseau business',
    description: "Rejoignez Biz Connect Academy : formations, réseau d'entrepreneurs, affiliation et opportunités business pour développer vos revenus en Afrique.",
  },
  '/inscription': {
    title: 'Inscription | Biz Connect Academy',
    description: "Inscrivez-vous à Biz Connect Academy et accédez aux formations, au réseau business et aux opportunités d'affiliation de la communauté.",
  },
  '/aide': {
    title: "Guide d'utilisation | Biz Connect Academy",
    description: "Consultez le guide d'utilisation de Biz Connect Academy et apprenez à profiter des formations, services et opportunités de la plateforme.",
  },
  '/contact': {
    title: 'Contacter le support | Biz Connect Academy',
    description: "Contactez l'équipe de Biz Connect Academy pour obtenir de l'aide concernant votre inscription, votre compte ou les services de la communauté.",
  },
  '/suggestions': {
    title: 'Boîte à suggestions | Biz Connect Academy',
    description: "Partagez vos idées avec Biz Connect Academy et contribuez à l'amélioration des services et de la communauté.",
  },
  '/admin': {
    title: 'Administration | Biz Connect Academy',
    description: 'Espace privé de gestion de Biz Connect Academy.',
    index: false,
  },
};

function setMeta(selector: string, attribute: string, value: string) {
  const element = document.head.querySelector<HTMLMetaElement>(selector);
  if (element) element.setAttribute(attribute, value);
}

export function SeoManager() {
  const [location] = useLocation();

  useEffect(() => {
    const path = location.split('?')[0].replace(/\/+$/, '') || '/';
    const page = pages[path] ?? {
      title: 'Page introuvable | Biz Connect Academy',
      description: 'Cette page est introuvable.',
      index: false,
    };
    const canonicalUrl = `${SITE_URL}${path === '/' ? '/' : path}`;

    document.title = page.title;
    setMeta('meta[name="description"]', 'content', page.description);
    setMeta('meta[name="robots"]', 'content', page.index === false ? 'noindex, nofollow' : 'index, follow');
    setMeta('meta[property="og:title"]', 'content', page.title);
    setMeta('meta[property="og:description"]', 'content', page.description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[name="twitter:title"]', 'content', page.title);
    setMeta('meta[name="twitter:description"]', 'content', page.description);

    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = canonicalUrl;
  }, [location]);

  return null;
}