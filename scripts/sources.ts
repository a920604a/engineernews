export type SourceType = 'youtube';
export type Lang = 'zh-TW' | 'en';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  channelId: string;
  url: string;
  tags: string[];
  lang: Lang;
  enabled: boolean;
  days: number[];    // 0=日, 1=一, 2=二, 3=三, 4=四, 5=五, 6=六
  maxAgeDays: number; // 影片最大年齡（天），超過則跳過
}

export const SOURCES: Source[] = [
  // ── YouTube ───────────────────────────────────────────────────────────────

  // 週一：職涯 / 心靈雞湯
  {
    id: 'da-ren-cademy',
    name: '大人學',
    type: 'youtube',
    channelId: 'UCCg4fgr3pQNiof8_Hxu9Xbw',
    url: 'https://www.youtube.com/@da.ren.cademy',
    tags: ['職涯', '個人成長', '學習'],
    lang: 'zh-TW',
    enabled: true,
    days: [0, 1],
    maxAgeDays: 365,
  },
  {
    id: 'muerstalk',
    name: 'muerstalk',
    type: 'youtube',
    channelId: 'UCIhaNRLn4OQDWZJiVvdhl5A',
    url: 'https://www.youtube.com/@muerstalk',
    tags: ['職涯', '個人成長', '學習'],
    lang: 'zh-TW',
    enabled: true,
    days: [1],
    maxAgeDays: 365,
  },
  {
    id: 'explainthis',
    name: 'ExplainThis 軟體工程白話聊',
    type: 'youtube',
    channelId: 'UC1dHM1wNhIZbWIZYjr9j7EQ',
    url: 'https://www.youtube.com/@explainthis-io',
    tags: ['軟體工程', '職涯', 'AI'],
    lang: 'zh-TW',
    enabled: true,
    days: [1, 4],
    maxAgeDays: 180,
  },

  // 週二：AI / ML
  {
    id: 'hungyi-lee',
    name: '李宏毅（NTU ML）',
    type: 'youtube',
    channelId: 'UC2ggjtuuWvxrHHHiaDH1dlQ',
    url: 'https://www.youtube.com/@HungyiLeeNTU',
    tags: ['機器學習', 'AI', '深度學習'],
    lang: 'zh-TW',
    enabled: true,
    days: [0, 2],
    maxAgeDays: 180,
  },
  {
    id: 'yuan-zi-neng',
    name: '原子能',
    type: 'youtube',
    channelId: 'UCdyIYolHVk-vx4EK_Su6C6w',
    url: 'https://www.youtube.com/@yuan_zi_neng',
    tags: ['AI', '科技'],
    lang: 'zh-TW',
    enabled: true,
    days: [2],
    maxAgeDays: 180,
  },
  {
    id: 'yannic-kilcher',
    name: 'Yannic Kilcher',
    type: 'youtube',
    channelId: 'UCZHmQk67mSJgfCCTn7xBfew',
    url: 'https://www.youtube.com/@YannicKilcher',
    tags: ['AI', '機器學習', '論文'],
    lang: 'en',
    enabled: true,
    days: [2],
    maxAgeDays: 180,
  },
  {
    id: 'two-minute-papers',
    name: 'Two Minute Papers',
    type: 'youtube',
    channelId: 'UCbfYPyITQ-7l4upoX8nvctg',
    url: 'https://www.youtube.com/@TwoMinutePapers',
    tags: ['AI', '研究'],
    lang: 'en',
    enabled: true,
    days: [2, 6],
    maxAgeDays: 180,
  },

  // 週三：工程實務
  {
    id: 's09g',
    name: 's09g',
    type: 'youtube',
    channelId: 'UCEr_HJJBplNZ-8sVb0NfatA',
    url: 'https://www.youtube.com/@s09g',
    tags: ['工程', '技術'],
    lang: 'zh-TW',
    enabled: true,
    days: [3],
    maxAgeDays: 180,
  },
  {
    id: 'it-coffee',
    name: 'IT 咖啡',
    type: 'youtube',
    channelId: 'UCXLV-KfDQAFUJ_as9H1Lfbw',
    url: 'https://www.youtube.com/@it-coffee',
    tags: ['IT', '開發'],
    lang: 'zh-TW',
    enabled: true,
    days: [3],
    maxAgeDays: 180,
  },
  {
    id: 'bytebytego',
    name: 'ByteByteGo',
    type: 'youtube',
    channelId: 'UCZgt6AzoyjslHTC9dz0UoTw',
    url: 'https://www.youtube.com/@ByteByteGo',
    tags: ['系統設計', '架構'],
    lang: 'en',
    enabled: true,
    days: [0, 3],
    maxAgeDays: 180,
  },
  {
    id: 'xuanyuancoding',
    name: '轩辕的编程宇宙',
    type: 'youtube',
    channelId: 'UCLkwRNY9Ck9-d1ulZYHsl-Q',
    url: 'https://www.youtube.com/@xuanyuancoding',
    tags: ['工程', '技術', '資安'],
    lang: 'zh-TW',
    enabled: true,
    days: [3],
    maxAgeDays: 180,
  },

  // 週四：工具 / 科技
  {
    id: 'tech-shrimp',
    name: '科技蝦',
    type: 'youtube',
    channelId: 'UCa6D2k5qhpOI9I-WT8fpd6g',
    url: 'https://www.youtube.com/@tech-shrimp',
    tags: ['科技', '工具'],
    lang: 'zh-TW',
    enabled: true,
    days: [4],
    maxAgeDays: 180,
  },
  {
    id: 'fireship',
    name: 'Fireship',
    type: 'youtube',
    channelId: 'UCsBjURrPoezykLs9EqgamOA',
    url: 'https://www.youtube.com/@Fireship',
    tags: ['web', '工具', 'AI'],
    lang: 'en',
    enabled: true,
    days: [0, 4],
    maxAgeDays: 180,
  },

  // 週五：視野 / 產業
  {
    id: 'the-valley-101',
    name: 'The Valley 101（矽谷）',
    type: 'youtube',
    channelId: 'UCKV2yWPB3wn0RTZh3cTD8YA',
    url: 'https://www.youtube.com/@TheValley101',
    tags: ['矽谷', '職涯', '科技產業'],
    lang: 'zh-TW',
    enabled: true,
    days: [5],
    maxAgeDays: 365,
  },
  {
    id: 'ycombinator',
    name: 'Y Combinator',
    type: 'youtube',
    channelId: 'UCcefcZRL2oaA_uBNeo5UOWg',
    url: 'https://www.youtube.com/@ycombinator',
    tags: ['創業', '產品', '職涯'],
    lang: 'en',
    enabled: true,
    days: [5],
    maxAgeDays: 365,
  },
  {
    id: 'mkbhd',
    name: 'MKBHD',
    type: 'youtube',
    channelId: 'UCBJycsmduvYEL83R_U4JriQ',
    url: 'https://www.youtube.com/@mkbhd',
    tags: ['科技', '產品'],
    lang: 'en',
    enabled: true,
    days: [5, 6],
    maxAgeDays: 365,
  },

  // 週六：輕鬆
  {
    id: 'benzi2662',
    name: 'benzi2662',
    type: 'youtube',
    channelId: 'UC-J5ksuTsGzqAbemiLRgcSw',
    url: 'https://www.youtube.com/@benzi2662',
    tags: ['個人成長', '學習'],
    lang: 'zh-TW',
    enabled: true,
    days: [6],
    maxAgeDays: 365,
  },
  {
    id: 'emmytw',
    name: 'Emmy追劇時間',
    type: 'youtube',
    channelId: 'UCUkwvRrpvWkocNdk9qIpRSw',
    url: 'https://www.youtube.com/@emmytw',
    tags: ['財經', '時事', '國際'],
    lang: 'zh-TW',
    enabled: true,
    days: [6],
    maxAgeDays: 365,
  },

  // ── 未來可加 ───────────────────────────────────────────────────────────────
  // { id: 'example-rss', name: '...', type: 'rss', channelId: '', url: '...', ... }
];
