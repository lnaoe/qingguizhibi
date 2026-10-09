export interface InboxLetter {
  id: string;
  senderId: string;
  senderNickname: string;
  senderAvatarUrl: string | null;
  subject: string | null;
  sentAt: string;
  isUnread: boolean;
}

export interface MailboxCursor {
  primaryAt: string;
  createdAt: string;
  id: string;
}

export interface MailboxCriteria {
  limit: number;
  cursor: MailboxCursor | null;
}

export interface InboxPage {
  items: InboxLetter[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SentLetter {
  id: string;
  recipientId: string;
  recipientNickname: string;
  recipientAvatarUrl: string | null;
  subject: string | null;
  sentAt: string;
}

export interface SentPage {
  items: SentLetter[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface DraftLetter {
  id: string;
  relationshipId: string;
  recipientId: string;
  recipientNickname: string;
  recipientAvatarUrl: string | null;
  subject: string | null;
  updatedAt: string;
}

export interface DraftPage {
  items: DraftLetter[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type ParseMailboxQueryResult =
  | { ok: true; criteria: MailboxCriteria }
  | { ok: false; errors: Record<string, string> };
