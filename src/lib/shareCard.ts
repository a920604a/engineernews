const OG_ROUTE_PREFIX = '/api/og';

export type OgArticleRoute = {
  lang: 'zh-TW' | 'en';
  postId: string;
};

export function normalizePathname(pathname: string) {
  return pathname.replace(/^\/+/, '').replace(/\/+$/, '');
}

export function getOgImageUrl(pathname: string, origin: string) {
  const normalized = normalizePathname(pathname);

  if (!normalized || normalized === 'posts' || normalized === 'en/posts') {
    return new URL(`${OG_ROUTE_PREFIX}/site.png`, origin).toString();
  }

  if (!normalized.startsWith('posts/') && !normalized.startsWith('en/posts/')) {
    return new URL(`${OG_ROUTE_PREFIX}/site.png`, origin).toString();
  }

  return new URL(`${OG_ROUTE_PREFIX}/${normalized}.png`, origin).toString();
}

export function getOgCacheKey(slug: string) {
  const normalized = normalizePathname(slug).replace(/^api\/og\//, '');
  return normalized.replace(/\.png$/, '');
}

export function parseOgArticleRoute(slug: string): OgArticleRoute | null {
  const cacheKey = getOgCacheKey(slug);
  const segments = cacheKey.split('/').filter(Boolean);

  if (segments[0] === 'posts' && segments.length >= 2) {
    return {
      lang: 'zh-TW',
      postId: segments.slice(1).join('/'),
    };
  }

  if (segments[0] === 'en' && segments[1] === 'posts' && segments.length >= 3) {
    return {
      lang: 'en',
      postId: segments.slice(2).join('/'),
    };
  }

  return null;
}

export function isOgSiteRoute(slug: string) {
  return getOgCacheKey(slug) === 'site';
}
