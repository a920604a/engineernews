export type PostLang = 'zh-TW' | 'en';

export function normalizeEnglishPostId(postId: string) {
  return postId.replace(/\.en$/, '');
}

export function getPostUrl(postId: string, lang: PostLang) {
  const normalizedId = normalizeEnglishPostId(postId);
  return lang === 'en' ? `/en/posts/${normalizedId}` : `/posts/${normalizedId}`;
}

export function getPostUrlFromRouteId(routeId: string, lang: PostLang) {
  return getPostUrl(routeId, lang);
}
