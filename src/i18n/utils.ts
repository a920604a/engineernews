import { ui, defaultLang, type Lang, type UiKey } from './ui';

export function getLangFromUrl(url: URL): Lang {
  const [, first] = url.pathname.split('/');
  if (first in ui) return first as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: UiKey): string {
    return (ui[lang][key] ?? ui[defaultLang][key]) as string;
  };
}

export function getLocalePath(lang: Lang, path: string): string {
  if (lang === defaultLang) return path;
  return `/en${path}`;
}

export function getLangSwitchUrl(url: URL, currentLang: Lang): string {
  const path = url.pathname;
  if (currentLang === 'en') {
    // /en/posts/slug → /posts/slug
    return path.replace(/^\/en/, '') || '/';
  } else {
    // /posts/slug → /en/posts/slug
    return `/en${path}`;
  }
}
