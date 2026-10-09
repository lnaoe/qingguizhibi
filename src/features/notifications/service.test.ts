import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import * as schema from '../../db/schema';
import type { AppDatabase } from '../../db/client';
import { encodeNotificationCursor } from './query';
import {
  createNotification,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './service';

const CURRENT_USER_ID = 'current-user';
const OTHER_USER_ID = 'other-user';
const BASE_TIME = new Date('2026-01-01T00:00:00.000Z').getTime();

function createTestDatabase(): AppDatabase {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_active_at TIMESTAMP
    );

    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      reference_type TEXT,
      reference_id TEXT,
      read_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX notifications_user_id_read_at_created_at_idx
      ON notifications(user_id, read_at, created_at);
  `);

  return drizzle(sqlite, { schema: { ...schema, ...authSchema } });
}

function seedUser(database: AppDatabase, id: string): void {
  database
    .insert(schema.users)
    .values({ id, email: `${id}@example.com` })
    .run();
}

function seedNotification(
  database: AppDatabase,
  options: {
    id: string;
    userId?: string;
    type?: (typeof schema.notificationTypeValues)[number];
    title?: string;
    body?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
    readAt?: Date | null;
    createdAt?: Date;
  },
): void {
  database
    .insert(schema.notifications)
    .values({
      id: options.id,
      userId: options.userId ?? CURRENT_USER_ID,
      type: options.type ?? 'system',
      title: options.title ?? options.id,
      body: options.body ?? null,
      referenceType: options.referenceType ?? null,
      referenceId: options.referenceId ?? null,
      readAt: options.readAt ?? null,
      createdAt: options.createdAt ?? new Date(BASE_TIME),
    })
    .run();
}

function readRawNotification(database: AppDatabase, id: string) {
  return database.$client
    .prepare(
      `SELECT read_at AS readAt FROM notifications WHERE id = ?`,
    )
    .get(id) as { readAt: number | null } | undefined;
}

function toSqliteSeconds(value: Date): number {
  return Math.floor(value.getTime() / 1000);
}

function countUnreadRows(database: AppDatabase, userId: string): number {
  const row = database.$client
    .prepare(
      `SELECT COUNT(*) AS count FROM notifications
       WHERE user_id = ? AND read_at IS NULL`,
    )
    .get(userId) as { count: number };

  return row.count;
}

describe('createNotification', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedUser(database, CURRENT_USER_ID);
  });

  it('creates a notification with defaults', () => {
    const id = createNotification(database, {
      userId: CURRENT_USER_ID,
      type: 'system',
      title: '系统通知',
    });
    const rows = database.select().from(schema.notifications).all();

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id,
      userId: CURRENT_USER_ID,
      type: 'system',
      title: '系统通知',
      body: null,
      referenceType: null,
      referenceId: null,
      readAt: null,
    });
    expect(rows[0].createdAt).toBeInstanceOf(Date);
  });

  it('supports a new_letter notification with reference fields', () => {
    const id = createNotification(database, {
      userId: CURRENT_USER_ID,
      type: 'new_letter',
      title: '小明 给你寄来一封信',
      body: '最近还好吗？',
      referenceType: 'letter',
      referenceId: 'letter-1',
      createdAt: new Date('2026-02-03T04:05:06.000Z'),
    });
    const rows = database.select().from(schema.notifications).all();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id,
      userId: CURRENT_USER_ID,
      type: 'new_letter',
      title: '小明 给你寄来一封信',
      body: '最近还好吗？',
      referenceType: 'letter',
      referenceId: 'letter-1',
      readAt: null,
      createdAt: new Date('2026-02-03T04:05:06.000Z'),
    });
  });
});

describe('listNotifications', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedUser(database, CURRENT_USER_ID);
    seedUser(database, OTHER_USER_ID);
  });

  it('returns only the current user notifications', () => {
    seedNotification(database, { id: 'current-1' });
    seedNotification(database, { id: 'other-1', userId: OTHER_USER_ID });

    const page = listNotifications(database, CURRENT_USER_ID, {
      unreadOnly: false,
      limit: 20,
      cursor: null,
    });

    expect(page.items.map((item) => item.id)).toEqual(['current-1']);
    expect(page.nextCursor).toBeNull();
    expect(page.hasMore).toBe(false);
  });

  it('orders by createdAt desc with a stable id tiebreaker', () => {
    seedNotification(database, {
      id: 'notification-a',
      createdAt: new Date(BASE_TIME + 1000),
    });
    seedNotification(database, {
      id: 'notification-b',
      createdAt: new Date(BASE_TIME + 1000),
    });
    seedNotification(database, {
      id: 'notification-c',
      createdAt: new Date(BASE_TIME),
    });

    const page = listNotifications(database, CURRENT_USER_ID, {
      unreadOnly: false,
      limit: 20,
      cursor: null,
    });

    expect(page.items.map((item) => item.id)).toEqual([
      'notification-b',
      'notification-a',
      'notification-c',
    ]);
  });

  it('paginates with a stable cursor', () => {
    seedNotification(database, { id: 'notification-1' });
    seedNotification(database, {
      id: 'notification-2',
      createdAt: new Date(BASE_TIME + 1000),
    });
    seedNotification(database, {
      id: 'notification-3',
      createdAt: new Date(BASE_TIME + 2000),
    });

    const firstPage = listNotifications(database, CURRENT_USER_ID, {
      unreadOnly: false,
      limit: 2,
      cursor: null,
    });

    expect(firstPage.items.map((item) => item.id)).toEqual([
      'notification-3',
      'notification-2',
    ]);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = listNotifications(database, CURRENT_USER_ID, {
      unreadOnly: false,
      limit: 2,
      cursor: {
        createdAt: firstPage.items[1].createdAt,
        id: firstPage.items[1].id,
      },
    });

    expect(secondPage.items.map((item) => item.id)).toEqual([
      'notification-1',
    ]);
    expect(secondPage.hasMore).toBe(false);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('breaks createdAt ties by id while paginating', () => {
    seedNotification(database, { id: 'notification-1' });
    seedNotification(database, { id: 'notification-2' });
    seedNotification(database, { id: 'notification-3' });

    const firstPage = listNotifications(database, CURRENT_USER_ID, {
      unreadOnly: false,
      limit: 2,
      cursor: null,
    });
    const secondPage = listNotifications(database, CURRENT_USER_ID, {
      unreadOnly: false,
      limit: 2,
      cursor: {
        createdAt: firstPage.items[1].createdAt,
        id: firstPage.items[1].id,
      },
    });

    expect(firstPage.items.map((item) => item.id)).toEqual([
      'notification-3',
      'notification-2',
    ]);
    expect(firstPage.nextCursor).toBe(
      encodeNotificationCursor({
        createdAt: firstPage.items[1].createdAt,
        id: firstPage.items[1].id,
      }),
    );
    expect(secondPage.items.map((item) => item.id)).toEqual([
      'notification-1',
    ]);
    expect(secondPage.hasMore).toBe(false);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('returns the unread count for only the current user', () => {
    seedNotification(database, { id: 'current-unread' });
    seedNotification(database, {
      id: 'current-read',
      readAt: new Date(BASE_TIME + 1000),
    });
    seedNotification(database, {
      id: 'other-unread',
      userId: OTHER_USER_ID,
    });

    expect(getUnreadNotificationCount(database, CURRENT_USER_ID)).toBe(1);
    expect(getUnreadNotificationCount(database, OTHER_USER_ID)).toBe(1);
  });

  it('filters unread notifications for the current user', () => {
    seedNotification(database, { id: 'current-unread' });
    seedNotification(database, {
      id: 'current-read',
      readAt: new Date(BASE_TIME + 1000),
    });
    seedNotification(database, {
      id: 'other-unread',
      userId: OTHER_USER_ID,
    });

    const page = listNotifications(database, CURRENT_USER_ID, {
      unreadOnly: true,
      limit: 20,
      cursor: null,
    });

    expect(page.items.map((item) => item.id)).toEqual(['current-unread']);
  });
});

describe('markNotificationRead', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedUser(database, CURRENT_USER_ID);
    seedUser(database, OTHER_USER_ID);
  });

  it('marks an own notification as read', () => {
    seedNotification(database, { id: 'notification-1' });

    const result = markNotificationRead(
      database,
      CURRENT_USER_ID,
      'notification-1',
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.alreadyRead).toBe(false);
    expect(result.notification.readAt).not.toBeNull();
    expect(readRawNotification(database, 'notification-1')?.readAt).not.toBeNull();
  });

  it('returns not_found for another user notification', () => {
    seedNotification(database, {
      id: 'notification-1',
      userId: OTHER_USER_ID,
    });

    expect(
      markNotificationRead(
        database,
        CURRENT_USER_ID,
        'notification-1',
      ),
    ).toMatchObject({ ok: false, code: 'not_found' });
    expect(readRawNotification(database, 'notification-1')?.readAt).toBeNull();
  });

  it('returns not_found for a missing notification', () => {
    expect(
      markNotificationRead(database, CURRENT_USER_ID, 'missing'),
    ).toMatchObject({ ok: false, code: 'not_found' });
  });

  it('is idempotent when the notification is already read', () => {
    const readAt = new Date(BASE_TIME + 5000);

    seedNotification(database, { id: 'notification-1', readAt });

    const result = markNotificationRead(
      database,
      CURRENT_USER_ID,
      'notification-1',
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.alreadyRead).toBe(true);
    expect(result.notification.readAt).toBe(readAt.toISOString());
    expect(readRawNotification(database, 'notification-1')?.readAt).toBe(
      toSqliteSeconds(readAt),
    );
  });
});

describe('markAllNotificationsRead', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedUser(database, CURRENT_USER_ID);
    seedUser(database, OTHER_USER_ID);
  });

  it('only marks the current user unread notifications as read', () => {
    seedNotification(database, { id: 'current-unread' });
    seedNotification(database, {
      id: 'current-read',
      readAt: new Date(BASE_TIME + 1000),
    });
    seedNotification(database, {
      id: 'other-unread',
      userId: OTHER_USER_ID,
    });

    const result = markAllNotificationsRead(database, CURRENT_USER_ID);

    expect(result.updatedCount).toBe(1);
    expect(countUnreadRows(database, CURRENT_USER_ID)).toBe(0);
    expect(countUnreadRows(database, OTHER_USER_ID)).toBe(1);
    expect(readRawNotification(database, 'current-read')?.readAt).toBe(
      toSqliteSeconds(new Date(BASE_TIME + 1000)),
    );
  });

  it('is idempotent when there are no unread notifications', () => {
    seedNotification(database, {
      id: 'current-read',
      readAt: new Date(BASE_TIME + 1000),
    });

    expect(markAllNotificationsRead(database, CURRENT_USER_ID)).toEqual({
      updatedCount: 0,
    });
    expect(markAllNotificationsRead(database, CURRENT_USER_ID)).toEqual({
      updatedCount: 0,
    });
  });
});
