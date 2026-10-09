import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull, lt, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import { notifications } from '../../db/schema';
import { encodeNotificationCursor } from './query';
import type {
  CreateNotificationInput,
  MarkAllNotificationsReadResult,
  MarkNotificationReadResult,
  NotificationCriteria,
  NotificationItem,
  NotificationPage,
} from './types';

type NotificationRow = typeof notifications.$inferSelect;

// Accepts either the root database or a transaction so notification writes can
// join the caller's transaction.
export type NotificationWriter = Pick<AppDatabase, 'insert'>;

function toNotificationItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createNotification(
  writer: NotificationWriter,
  input: CreateNotificationInput,
): string {
  const id = randomUUID();

  writer
    .insert(notifications)
    .values({
      id,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      createdAt: input.createdAt ?? new Date(),
    })
    .run();

  return id;
}

export function listNotifications(
  database: AppDatabase,
  currentUserId: string,
  criteria: NotificationCriteria,
): NotificationPage {
  const conditions: SQL[] = [eq(notifications.userId, currentUserId)];

  if (criteria.unreadOnly) {
    conditions.push(isNull(notifications.readAt));
  }

  if (criteria.cursor) {
    const cursorCreatedAt = new Date(criteria.cursor.createdAt);

    conditions.push(
      or(
        lt(notifications.createdAt, cursorCreatedAt),
        and(
          eq(notifications.createdAt, cursorCreatedAt),
          lt(notifications.id, criteria.cursor.id),
        ),
      )!,
    );
  }

  const rows = database
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(criteria.limit + 1)
    .all();

  const hasMore = rows.length > criteria.limit;
  const pageRows = hasMore ? rows.slice(0, criteria.limit) : rows;
  const lastRow = pageRows.at(-1);

  return {
    items: pageRows.map(toNotificationItem),
    nextCursor:
      hasMore && lastRow
        ? encodeNotificationCursor({
            createdAt: lastRow.createdAt.toISOString(),
            id: lastRow.id,
          })
        : null,
    hasMore,
  };
}

export function getUnreadNotificationCount(
  database: AppDatabase,
  currentUserId: string,
): number {
  const rows = database
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, currentUserId),
        isNull(notifications.readAt),
      ),
    )
    .all();

  return rows.length;
}

export function markNotificationRead(
  database: AppDatabase,
  currentUserId: string,
  notificationId: string,
): MarkNotificationReadResult {
  const existing = database
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, currentUserId),
      ),
    )
    .get();

  // Missing and foreign notifications look the same on purpose: the caller must
  // not learn that a notification exists for another user.
  if (!existing) {
    return {
      ok: false,
      code: 'not_found',
      message: '找不到这条通知',
    };
  }

  if (existing.readAt) {
    return {
      ok: true,
      notification: toNotificationItem(existing),
      alreadyRead: true,
    };
  }

  const readAt = new Date();

  database
    .update(notifications)
    .set({ readAt })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, currentUserId),
      ),
    )
    .run();

  return {
    ok: true,
    notification: toNotificationItem({ ...existing, readAt }),
    alreadyRead: false,
  };
}

export function markAllNotificationsRead(
  database: AppDatabase,
  currentUserId: string,
): MarkAllNotificationsReadResult {
  const result = database
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, currentUserId),
        isNull(notifications.readAt),
      ),
    )
    .run();

  return { updatedCount: result.changes };
}
