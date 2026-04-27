export type PostLang = 'zh-TW' | 'en';

export function normalizeEnglishPostId(postId: string) {
  // Astro <v5 / D1 format: "ipoai.en"  → strip "\.en$"
  // Astro v5 content layer: "ipoaien"   → strip "en$" (dot removed + lowercased by v5)
  return postId.replace(/\.en$/, '').replace(/en$/, '');
}

export function getPostUrl(postId: string, lang: PostLang) {
  // Astro v5 lowercases all content collection IDs; normalise here for consistency
  const normalizedId = normalizeEnglishPostId(postId).toLowerCase();
  return lang === 'en' ? `/en/posts/${normalizedId}` : `/posts/${normalizedId}`;
}

export function getPostUrlFromRouteId(routeId: string, lang: PostLang) {
  return getPostUrl(routeId, lang);
}
