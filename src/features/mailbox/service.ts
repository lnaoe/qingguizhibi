import { and, desc, eq, isNotNull, lt, or } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import { letters, profiles } from '../../db/schema';
import { encodeMailboxCursor } from './query';
import type {
  InboxLetter,
  InboxPage,
  DraftLetter,
  DraftPage,
  MailboxCriteria,
  MailboxCursor,
  SentLetter,
  SentPage,
} from './types';

function getCursorCondition(cursor: MailboxCursor) {
  const cursorPrimaryAt = new Date(cursor.primaryAt);
  const cursorCreatedAt = new Date(cursor.createdAt);

  return or(
    lt(letters.sentAt, cursorPrimaryAt),
    and(
      eq(letters.sentAt, cursorPrimaryAt),
      lt(letters.createdAt, cursorCreatedAt),
    ),
    and(
      eq(letters.sentAt, cursorPrimaryAt),
      eq(letters.createdAt, cursorCreatedAt),
      lt(letters.id, cursor.id),
    ),
  )!;
}

export function getInboxPage(
  database: AppDatabase,
  currentUserId: string,
  criteria: MailboxCriteria,
): InboxPage {
  const conditions = [
    eq(letters.recipientId, currentUserId),
    eq(letters.status, 'sent'),
    isNotNull(letters.sentAt),
  ];

  if (criteria.cursor) {
    conditions.push(getCursorCondition(criteria.cursor));
  }

  const rows = database
    .select({
      id: letters.id,
      senderId: letters.senderId,
      senderNickname: profiles.nickname,
      senderAvatarUrl: profiles.avatarUrl,
      subject: letters.subject,
      sentAt: letters.sentAt,
      createdAt: letters.createdAt,
      readAt: letters.readAt,
    })
    .from(letters)
    .leftJoin(profiles, eq(profiles.userId, letters.senderId))
    .where(and(...conditions))
    .orderBy(
      desc(letters.sentAt),
      desc(letters.createdAt),
      desc(letters.id),
    )
    .limit(criteria.limit + 1)
    .all();

  const hasMore = rows.length > criteria.limit;
  const pageRows = rows.slice(0, criteria.limit);

  const items: InboxLetter[] = pageRows.map((row) => ({
    id: row.id,
    senderId: row.senderId,
    senderNickname: row.senderNickname ?? '一位笔友',
    senderAvatarUrl: row.senderAvatarUrl,
    subject: row.subject,
    sentAt: (row.sentAt ?? row.createdAt).toISOString(),
    isUnread: row.readAt === null,
  }));

  const lastRow = pageRows.at(-1);
  const nextCursor =
    hasMore && lastRow
      ? encodeMailboxCursor({
          primaryAt: (lastRow.sentAt ?? lastRow.createdAt).toISOString(),
          createdAt: lastRow.createdAt.toISOString(),
          id: lastRow.id,
        })
      : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export function getSentPage(
  database: AppDatabase,
  currentUserId: string,
  criteria: MailboxCriteria,
): SentPage {
  const conditions = [
    eq(letters.senderId, currentUserId),
    eq(letters.status, 'sent'),
    isNotNull(letters.sentAt),
  ];

  if (criteria.cursor) {
    conditions.push(getCursorCondition(criteria.cursor));
  }

  const rows = database
    .select({
      id: letters.id,
      recipientId: letters.recipientId,
      recipientNickname: profiles.nickname,
      recipientAvatarUrl: profiles.avatarUrl,
      subject: letters.subject,
      sentAt: letters.sentAt,
      createdAt: letters.createdAt,
    })
    .from(letters)
    .leftJoin(profiles, eq(profiles.userId, letters.recipientId))
    .where(and(...conditions))
    .orderBy(
      desc(letters.sentAt),
      desc(letters.createdAt),
      desc(letters.id),
    )
    .limit(criteria.limit + 1)
    .all();

  const hasMore = rows.length > criteria.limit;
  const pageRows = rows.slice(0, criteria.limit);

  const items: SentLetter[] = pageRows.map((row) => ({
    id: row.id,
    recipientId: row.recipientId,
    recipientNickname: row.recipientNickname ?? '一位笔友',
    recipientAvatarUrl: row.recipientAvatarUrl,
    subject: row.subject,
    sentAt: (row.sentAt ?? row.createdAt).toISOString(),
  }));

  const lastRow = pageRows.at(-1);
  const nextCursor =
    hasMore && lastRow
      ? encodeMailboxCursor({
          primaryAt: (lastRow.sentAt ?? lastRow.createdAt).toISOString(),
          createdAt: lastRow.createdAt.toISOString(),
          id: lastRow.id,
        })
      : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export function getDraftsPage(
  database: AppDatabase,
  currentUserId: string,
  criteria: MailboxCriteria,
): DraftPage {
  const conditions = [
    eq(letters.senderId, currentUserId),
    eq(letters.status, 'draft'),
  ];

  if (criteria.cursor) {
    const cursorUpdatedAt = new Date(criteria.cursor.primaryAt);
    const cursorCreatedAt = new Date(criteria.cursor.createdAt);

    conditions.push(
      or(
        lt(letters.updatedAt, cursorUpdatedAt),
        and(
          eq(letters.updatedAt, cursorUpdatedAt),
          lt(letters.createdAt, cursorCreatedAt),
        ),
        and(
          eq(letters.updatedAt, cursorUpdatedAt),
          eq(letters.createdAt, cursorCreatedAt),
          lt(letters.id, criteria.cursor.id),
        ),
      )!,
    );
  }

  const rows = database
    .select({
      id: letters.id,
      relationshipId: letters.relationshipId,
      recipientId: letters.recipientId,
      recipientNickname: profiles.nickname,
      recipientAvatarUrl: profiles.avatarUrl,
      subject: letters.subject,
      updatedAt: letters.updatedAt,
      createdAt: letters.createdAt,
    })
    .from(letters)
    .leftJoin(profiles, eq(profiles.userId, letters.recipientId))
    .where(and(...conditions))
    .orderBy(
      desc(letters.updatedAt),
      desc(letters.createdAt),
      desc(letters.id),
    )
    .limit(criteria.limit + 1)
    .all();

  const hasMore = rows.length > criteria.limit;
  const pageRows = rows.slice(0, criteria.limit);

  const items: DraftLetter[] = pageRows.map((row) => ({
    id: row.id,
    relationshipId: row.relationshipId ?? '',
    recipientId: row.recipientId,
    recipientNickname: row.recipientNickname ?? '一位笔友',
    recipientAvatarUrl: row.recipientAvatarUrl,
    subject: row.subject,
    updatedAt: row.updatedAt.toISOString(),
  }));

  const lastRow = pageRows.at(-1);
  const nextCursor =
    hasMore && lastRow
      ? encodeMailboxCursor({
          primaryAt: lastRow.updatedAt.toISOString(),
          createdAt: lastRow.createdAt.toISOString(),
          id: lastRow.id,
        })
      : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}
