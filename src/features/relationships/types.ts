export type RelationshipStatus = 'active' | 'ended';

export interface RelationshipPeer {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  country: string;
  city: string;
  ageRange: string;
}

export interface RelationshipSummary {
  id: string;
  status: RelationshipStatus;
  startedAt: string;
  endedAt: string | null;
  lastLetterAt: string | null;
  peer: RelationshipPeer;
}

export type EndRelationshipFailureCode =
  | 'relationship_not_found'
  | 'forbidden';

export type EndRelationshipResult =
  | {
      ok: true;
      relationship: RelationshipSummary;
      alreadyEnded: boolean;
    }
  | {
      ok: false;
      code: EndRelationshipFailureCode;
      message: string;
    };

export interface RelationshipCursor {
  type: 'started_at';
  startedAt: string;
  id: string;
}

export interface RelationshipCriteria {
  status: RelationshipStatus | null;
  cursor: RelationshipCursor | null;
  limit: number;
}

export interface RelationshipPage {
  items: RelationshipSummary[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type ParseRelationshipQueryResult =
  | { ok: true; criteria: RelationshipCriteria }
  | { ok: false; errors: Record<string, string> };

export interface RelationshipLetter {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string | null;
  sentAt: string;
  readAt: string | null;
  isMine: boolean;
}

export interface RelationshipLetterCursor {
  type: 'sent_at';
  sentAt: string;
  id: string;
}

export interface RelationshipLettersCriteria {
  cursor: RelationshipLetterCursor | null;
  limit: number;
}

export interface RelationshipLettersPage {
  items: RelationshipLetter[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type ParseRelationshipLettersQueryResult =
  | { ok: true; criteria: RelationshipLettersCriteria }
  | { ok: false; errors: Record<string, string> };
