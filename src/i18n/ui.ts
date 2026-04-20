export const languages = {
  'zh-TW': '繁體中文',
  'en': 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'zh-TW';

export const ui = {
  'zh-TW': {
    'nav.home': 'Engineer News',
    'nav.projects': '作品集',
    'nav.tags': '標籤',
    'site.tagline': '捕捉工程對話中的精華，轉化為結構化的技術知識庫。',
    'post.tldr': 'TL;DR',
    'post.tags': '相關標籤',
    'post.prev': '上一篇',
    'post.next': '下一篇',
    'post.readingTime': '分鐘閱讀',
    'search.placeholder': '語義搜尋技術知識...',
    'search.results': 'AI 語義搜尋結果',
    'search.searching': '搜尋中...',
    'search.similarity': '相似度',
    'feed.empty': '目前還沒有文章。',
    'projects.title': '作品集',
    'projects.subtitle': 'Side Projects 與個人作品。',
    'projects.related': '相關文章',
    'lang.switch': 'English',
    'footer.built': '使用 Astro & Cloudflare 構建',
  },
  'en': {
    'nav.home': 'Engineer News',
    'nav.projects': 'Portfolio',
    'nav.tags': 'Tags',
    'site.tagline': 'Capturing the essence of engineering conversations into a structured knowledge base.',
    'post.tldr': 'TL;DR',
    'post.tags': 'Tags',
    'post.prev': 'Previous',
    'post.next': 'Next',
    'post.readingTime': 'min read',
    'search.placeholder': 'Semantic search...',
    'search.results': 'AI Semantic Results',
    'search.searching': 'Searching...',
    'search.similarity': 'Similarity',
    'feed.empty': 'No posts yet.',
    'projects.title': 'Portfolio',
    'projects.subtitle': 'Side projects and personal work.',
    'projects.related': 'Related posts',
    'lang.switch': '繁體中文',
    'footer.built': 'Built with Astro & Cloudflare',
  },
} as const;

export type UiKey = keyof typeof ui[typeof defaultLang];
