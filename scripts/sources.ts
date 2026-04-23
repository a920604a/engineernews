export type SourceType = 'youtube';
export type Schedule = 'daily' | 'weekly';
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
  schedule: Schedule;
}

export const SOURCES: Source[] = [
  // ── YouTube ───────────────────────────────────────────────────────────────
  {
    id: 'hungyi-lee',
    name: '李宏毅（NTU ML）',
    type: 'youtube',
    channelId: 'UC2ggjtuuWvxrHHHiaDH1dlQ',
    url: 'https://www.youtube.com/@HungyiLeeNTU',
    tags: ['機器學習', 'AI', '深度學習'],
    lang: 'zh-TW',
    enabled: true,
    schedule: 'weekly',
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
    schedule: 'weekly',
  },
  {
    id: 's09g',
    name: 's09g',
    type: 'youtube',
    channelId: 'UCEr_HJJBplNZ-8sVb0NfatA',
    url: 'https://www.youtube.com/@s09g',
    tags: ['工程', '技術'],
    lang: 'zh-TW',
    enabled: true,
    schedule: 'weekly',
  },
  {
    id: 'benzi2662',
    name: 'benzi2662',
    type: 'youtube',
    channelId: 'UC-J5ksuTsGzqAbemiLRgcSw',
    url: 'https://www.youtube.com/@benzi2662',
    tags: [],
    lang: 'zh-TW',
    enabled: true,
    schedule: 'weekly',
  },
  {
    id: 'tech-shrimp',
    name: '科技蝦',
    type: 'youtube',
    channelId: 'UCa6D2k5qhpOI9I-WT8fpd6g',
    url: 'https://www.youtube.com/@tech-shrimp',
    tags: ['科技', '工具'],
    lang: 'zh-TW',
    enabled: true,
    schedule: 'weekly',
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
    schedule: 'weekly',
  },
  {
    id: 'the-valley-101',
    name: 'The Valley 101（矽谷）',
    type: 'youtube',
    channelId: 'UCKV2yWPB3wn0RTZh3cTD8YA',
    url: 'https://www.youtube.com/@TheValley101',
    tags: ['矽谷', '職涯', '科技產業'],
    lang: 'zh-TW',
    enabled: true,
    schedule: 'weekly',
  },
  {
    id: 'muerstalk',
    name: 'muerstalk',
    type: 'youtube',
    channelId: 'UCIhaNRLn4OQDWZJiVvdhl5A',
    url: 'https://www.youtube.com/@muerstalk',
    tags: [],
    lang: 'zh-TW',
    enabled: true,
    schedule: 'weekly',
  },
  {
    id: 'da-ren-cademy',
    name: '大人學',
    type: 'youtube',
    channelId: 'UCCg4fgr3pQNiof8_Hxu9Xbw',
    url: 'https://www.youtube.com/@da.ren.cademy',
    tags: ['職涯', '個人成長', '學習'],
    lang: 'zh-TW',
    enabled: true,
    schedule: 'weekly',
  },

  // ── 未來可加 ───────────────────────────────────────────────────────────────
  // { id: 'example-rss', name: '...', type: 'rss', channelId: '', url: '...', ... }
];
