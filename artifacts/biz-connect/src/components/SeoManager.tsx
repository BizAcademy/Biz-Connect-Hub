import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGetContent } from '@workspace/api-client-react';

const SITE_URL = 'https://presentationbizconnectacademy.com';
const DEFAULT_SHARE_IMAGE = 'https://res.cloudinary.com/czj2ytwj/image/upload/v1786924164/biz-connect/zvchuyyq6iep4g3infv9.png';
const HOME_DESCRIPTION = "La Biz Connect Academy, une plateforme de marketing digital qui vous permet de gagner des revenus avec vos vues sur WhatsApp, avec son système d'affiliation et sa fonctionnalité Digital Store pour vendre vos produits digitaux. Elle vous permet également de développer vos compétences grâce à sa large gamme de formations et de développer votre base de données clientèle grâce au fichier de contacts. Disponible dans plus de 20 pays d'Afrique.";

const pages: Record<string, { title: string; description: string; index?: boolean }> = {
  '/': {
    title: 'Biz Connect Academy | Formation et réseau business',
    description: HOME_DESCRIPTION,
  },
  '/inscription': {
    title: 'Inscription | Biz Connect Academy',
    description: "Inscrivez-vous à Biz Connect Academy et accédez aux formations, au réseau business et aux opportunités d'affiliation de la communauté.",
    index: false,
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
  const { data: content } = useGetContent();

  useEffect(() => {
    const path = location.split('?')[0].replace(/\/+$/, '') || '/';
    const page = pages[path] ?? {
      title: 'Page introuvable | Biz Connect Academy',
      description: 'Cette page est introuvable.',
      index: false,
    };
    const canonicalUrl = `${SITE_URL}${path === '/' ? '/' : path}`;
    const shareImage = path === '/' && content?.communityImageUrl
      ? content.communityImageUrl
      : DEFAULT_SHARE_IMAGE;

    document.title = page.title;
    setMeta('meta[name="description"]', 'content', page.description);
    setMeta('meta[name="robots"]', 'content', page.index === false ? 'noindex, nofollow' : 'index, follow');
    setMeta('meta[property="og:title"]', 'content', page.title);
    setMeta('meta[property="og:description"]', 'content', page.description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[property="og:image"]', 'content', shareImage);
    setMeta('meta[name="twitter:title"]', 'content', page.title);
    setMeta('meta[name="twitter:description"]', 'content', page.description);
    setMeta('meta[name="twitter:image"]', 'content', shareImage);

    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = canonicalUrl;
  }, [content, location]);

  return null;
}