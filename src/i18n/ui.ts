export const languages = {
  'zh-tw': '繁體中文',
  'en': 'English',
};

export const defaultLang = 'zh-tw';

export const ui = {
  'zh-tw': {
    'nav.home': '技術決策',
    'nav.projects': '作品集',
    'search.placeholder': '搜尋技術決策與知識...',
    'search.results': 'AI 語義搜尋結果：',
    'search.searching': '正在搜尋...',
    'search.similarity': '相似度',
    'footer.built': '使用 Astro & Cloudflare 構建',
  },
  'en': {
    'nav.home': 'Tech News',
    'nav.projects': 'Portfolio',
    'search.placeholder': 'Search technical decisions...',
    'search.results': 'AI Semantic Results:',
    'search.searching': 'Searching...',
    'search.similarity': 'Similarity',
    'footer.built': 'Built with Astro & Cloudflare',
  },
} as const;
