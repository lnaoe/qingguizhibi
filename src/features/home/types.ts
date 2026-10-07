import type { DiscoveryPenpal } from '../discovery/types';

export interface HomeRecentLetter {
  id: string;
  senderId: string;
  senderNickname: string;
  senderAvatarUrl: string | null;
  subject: string | null;
  sentAt: string;
  isUnread: boolean;
}

export interface HomeSnapshot {
  todayEncounters: DiscoveryPenpal[];
  recentLetters: HomeRecentLetter[];
}
