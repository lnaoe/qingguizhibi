export interface DiscoveryInterest {
  id: string;
  name: string;
  slug: string;
  category: string | null;
}

export interface DiscoveryPenpal {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  country: string;
  city: string;
  ageRange: string;
  languages: string[];
  interests: DiscoveryInterest[];
}

export type PublicPenpalInterest = DiscoveryInterest;

export interface PublicPenpalProfile {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  country: string;
  city: string;
  ageRange: string;
  languages: string[];
  bio: string;
  penpalReasons: string[];
  interests: PublicPenpalInterest[];
}

export type DiscoveryCursor =
  | { type: 'id'; id: string }
  | { type: 'recommend'; id: string; score: number };

export interface DiscoveryCriteria {
  limit: number;
  cursor: DiscoveryCursor | null;
  ageRange: string | null;
  language: string | null;
  country: string | null;
  city: string | null;
  interestIds: string[];
  recommend: boolean;
}

export interface DiscoveryPage {
  items: DiscoveryPenpal[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type ParseDiscoveryQueryResult =
  | { ok: true; criteria: DiscoveryCriteria }
  | { ok: false; errors: Record<string, string> };
