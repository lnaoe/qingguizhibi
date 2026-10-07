import type { OnboardingValues } from './types';

export const AGE_RANGE_OPTIONS = [
  '18-24',
  '25-29',
  '30-34',
  '35-44',
  '45-54',
  '55+',
] as const;

export const LANGUAGE_OPTIONS = [
  '中文（简体）',
  '中文（繁體）',
  'English',
  '日本語',
  '한국어',
  'Français',
  'Deutsch',
  'Español',
] as const;

export interface InterestOption {
  id: string;
  name: string;
  slug: string;
  category: string;
}

export const INTEREST_OPTIONS: readonly InterestOption[] = [
  { id: 'reading', name: '阅读', slug: 'reading', category: 'culture' },
  { id: 'writing', name: '写作', slug: 'writing', category: 'culture' },
  { id: 'film', name: '电影', slug: 'film', category: 'culture' },
  { id: 'music', name: '音乐', slug: 'music', category: 'culture' },
  { id: 'photography', name: '摄影', slug: 'photography', category: 'arts' },
  { id: 'travel', name: '旅行', slug: 'travel', category: 'life' },
  { id: 'food', name: '美食', slug: 'food', category: 'life' },
  { id: 'sports', name: '运动', slug: 'sports', category: 'life' },
  { id: 'nature', name: '自然', slug: 'nature', category: 'life' },
  { id: 'history', name: '历史', slug: 'history', category: 'knowledge' },
  { id: 'psychology', name: '心理', slug: 'psychology', category: 'knowledge' },
  { id: 'crafts', name: '手工', slug: 'crafts', category: 'arts' },
  { id: 'games', name: '游戏', slug: 'games', category: 'entertainment' },
  { id: 'anime', name: '动漫', slug: 'anime', category: 'entertainment' },
  { id: 'technology', name: '科技', slug: 'technology', category: 'knowledge' },
  { id: 'art', name: '艺术', slug: 'art', category: 'arts' },
  { id: 'languages', name: '语言', slug: 'languages', category: 'knowledge' },
  { id: 'gardening', name: '园艺', slug: 'gardening', category: 'life' },
];

export const PENPAL_REASON_OPTIONS = [
  '认识不同的人生',
  '分享日常生活',
  '交换想法与观点',
  '练习写作',
  '找到长期笔友',
  '慢慢建立信任',
  '享受等待与回信',
] as const;

export const EMPTY_ONBOARDING_VALUES: OnboardingValues = {
  nickname: '',
  avatarUrl: '',
  country: '',
  city: '',
  ageRange: '',
  languages: [],
  interestIds: [],
  bio: '',
  penpalReasons: [],
};
