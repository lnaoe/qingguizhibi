import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import type { AppDatabase } from '../../db/client';
import * as schema from '../../db/schema';
import { parseMailboxQuery } from './query';
import { getDraftsPage, getInboxPage, getSentPage } from './service';

const CURRENT_USER_ID = 'current-user';

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

    CREATE TABLE profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      nickname TEXT NOT NULL,
      avatar_url TEXT,
      country TEXT,
      city TEXT,
      age_range TEXT,
      bio TEXT,
      penpal_reason TEXT,
      languages JSON,
      visibility TEXT NOT NULL DEFAULT 'public',
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE letters (
      id TEXT PRIMARY KEY,
      relationship_id TEXT,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      sent_at TIMESTAMP,
      read_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return drizzle(sqlite, { schema: { ...schema, ...authSchema } });
}

function seedUser(
  database: AppDatabase,
  id: string,
  nickname: string,
  avatarUrl: string | null = null,
): void {
  database
    .insert(schema.users)
    .values({
      id,
      email: `${id}@example.com`,
    })
    .run();
  database
    .insert(schema.profiles)
    .values({
      userId: id,
      nickname,
      avatarUrl,
      onboardingCompleted: true,
    })
    .run();
}

function seedLetter(
  database: AppDatabase,
  values: {
    id: string;
    relationshipId?: string | null;
    senderId: string;
    recipientId: string;
    subject: string | null;
    body?: string;
    status: 'draft' | 'sent';
    sentAt: Date | null;
    readAt: Date | null;
    createdAt: Date;
    updatedAt?: Date;
  },
): void {
  database
    .insert(schema.letters)
    .values({
      id: values.id,
      relationshipId: values.relationshipId ?? null,
      senderId: values.senderId,
      recipientId: values.recipientId,
      subject: values.subject,
      body: values.body ?? '这是一封来信。',
      status: values.status,
      sentAt: values.sentAt,
      readAt: values.readAt,
      createdAt: values.createdAt,
      updatedAt: values.updatedAt ?? values.createdAt,
    })
    .run();
}

describe('mailbox service', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedUser(database, CURRENT_USER_ID, '当前用户');
    seedUser(database, 'sender-a', '青笺', 'https://example.com/a.png');
    seedUser(database, 'sender-b', '远山');
    seedUser(database, 'other-recipient', '另一位用户');
  });

  it('returns only current user sent letters, newest first, with unread state', () => {
    seedLetter(database, {
      id: 'older-inbox-letter',
      senderId: 'sender-a',
      recipientId: CURRENT_USER_ID,
      subject: '旧信',
      status: 'sent',
      sentAt: new Date('2026-01-01T08:00:00.000Z'),
      readAt: new Date('2026-01-02T08:00:00.000Z'),
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'newer-inbox-letter',
      senderId: 'sender-b',
      recipientId: CURRENT_USER_ID,
      subject: '新信',
      status: 'sent',
      sentAt: new Date('2026-01-03T08:00:00.000Z'),
      readAt: null,
      createdAt: new Date('2026-01-03T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'draft-letter',
      senderId: 'sender-a',
      recipientId: CURRENT_USER_ID,
      subject: '草稿',
      status: 'draft',
      sentAt: null,
      readAt: null,
      createdAt: new Date('2026-01-04T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'letter-for-someone-else',
      senderId: 'sender-a',
      recipientId: 'other-recipient',
      subject: '给别人的信',
      status: 'sent',
      sentAt: new Date('2026-01-05T08:00:00.000Z'),
      readAt: null,
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    });

    const page = getInboxPage(database, CURRENT_USER_ID, {
      limit: 20,
      cursor: null,
    });

    expect(page.items.map((letter) => letter.id)).toEqual([
      'newer-inbox-letter',
      'older-inbox-letter',
    ]);
    expect(page.items[0]).toEqual({
      id: 'newer-inbox-letter',
      senderId: 'sender-b',
      senderNickname: '远山',
      senderAvatarUrl: null,
      subject: '新信',
      sentAt: '2026-01-03T08:00:00.000Z',
      isUnread: true,
    });
    expect(page.items[1]?.isUnread).toBe(false);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it('falls back when the sender profile is missing', () => {
    database
      .insert(schema.users)
      .values({
        id: 'sender-without-profile',
        email: 'sender-without-profile@example.com',
      })
      .run();
    seedLetter(database, {
      id: 'letter-without-profile',
      senderId: 'sender-without-profile',
      recipientId: CURRENT_USER_ID,
      subject: null,
      status: 'sent',
      sentAt: new Date('2026-01-02T08:00:00.000Z'),
      readAt: null,
      createdAt: new Date('2026-01-02T08:00:00.000Z'),
    });

    const page = getInboxPage(database, CURRENT_USER_ID, {
      limit: 20,
      cursor: null,
    });

    expect(page.items[0]).toMatchObject({
      senderNickname: '一位笔友',
      subject: null,
    });
  });

  it('paginates by sent time, created time and id without duplicates', () => {
    const sharedSentAt = new Date('2026-01-03T08:00:00.000Z');

    ['a', 'b', 'c', 'd', 'e'].forEach((suffix, index) => {
      seedLetter(database, {
        id: `letter-${suffix}`,
        senderId: 'sender-a',
        recipientId: CURRENT_USER_ID,
        subject: `第 ${index + 1} 封`,
        status: 'sent',
        sentAt: sharedSentAt,
        readAt: null,
        createdAt: new Date(`2026-01-0${index + 1}T08:00:00.000Z`),
      });
    });

    const firstPage = getInboxPage(database, CURRENT_USER_ID, {
      limit: 2,
      cursor: null,
    });
    const secondQuery = parseMailboxQuery(
      new URLSearchParams({
        limit: '2',
        cursor: firstPage.nextCursor ?? '',
      }),
    );

    expect(firstPage.items.map((letter) => letter.id)).toEqual([
      'letter-e',
      'letter-d',
    ]);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).not.toBeNull();
    expect(secondQuery.ok).toBe(true);

    if (!secondQuery.ok) {
      return;
    }

    const secondPage = getInboxPage(
      database,
      CURRENT_USER_ID,
      secondQuery.criteria,
    );

    expect(secondPage.items.map((letter) => letter.id)).toEqual([
      'letter-c',
      'letter-b',
    ]);
    expect(secondPage.hasMore).toBe(true);

    const thirdQuery = parseMailboxQuery(
      new URLSearchParams({
        limit: '2',
        cursor: secondPage.nextCursor ?? '',
      }),
    );

    expect(thirdQuery.ok).toBe(true);

    if (!thirdQuery.ok) {
      return;
    }

    const thirdPage = getInboxPage(
      database,
      CURRENT_USER_ID,
      thirdQuery.criteria,
    );

    expect(thirdPage.items.map((letter) => letter.id)).toEqual(['letter-a']);
    expect(thirdPage.hasMore).toBe(false);
    expect(thirdPage.nextCursor).toBeNull();
  });

  it('returns only current user sent letters, newest first, with recipient summary', () => {
    seedLetter(database, {
      id: 'older-sent-letter',
      senderId: CURRENT_USER_ID,
      recipientId: 'sender-a',
      subject: '旧信',
      status: 'sent',
      sentAt: new Date('2026-01-01T08:00:00.000Z'),
      readAt: null,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'newer-sent-letter',
      senderId: CURRENT_USER_ID,
      recipientId: 'sender-b',
      subject: '新信',
      status: 'sent',
      sentAt: new Date('2026-01-03T08:00:00.000Z'),
      readAt: null,
      createdAt: new Date('2026-01-03T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'current-user-draft',
      senderId: CURRENT_USER_ID,
      recipientId: 'sender-a',
      subject: '草稿',
      status: 'draft',
      sentAt: null,
      readAt: null,
      createdAt: new Date('2026-01-04T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'sent-by-someone-else',
      senderId: 'sender-a',
      recipientId: 'sender-b',
      subject: '别人的信',
      status: 'sent',
      sentAt: new Date('2026-01-05T08:00:00.000Z'),
      readAt: null,
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    });

    const page = getSentPage(database, CURRENT_USER_ID, {
      limit: 20,
      cursor: null,
    });

    expect(page.items.map((letter) => letter.id)).toEqual([
      'newer-sent-letter',
      'older-sent-letter',
    ]);
    expect(page.items[0]).toEqual({
      id: 'newer-sent-letter',
      recipientId: 'sender-b',
      recipientNickname: '远山',
      recipientAvatarUrl: null,
      subject: '新信',
      sentAt: '2026-01-03T08:00:00.000Z',
    });
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it('falls back when a sent recipient profile is missing', () => {
    database
      .insert(schema.users)
      .values({
        id: 'recipient-without-profile',
        email: 'recipient-without-profile@example.com',
      })
      .run();
    seedLetter(database, {
      id: 'sent-without-profile',
      senderId: CURRENT_USER_ID,
      recipientId: 'recipient-without-profile',
      subject: null,
      status: 'sent',
      sentAt: new Date('2026-01-02T08:00:00.000Z'),
      readAt: null,
      createdAt: new Date('2026-01-02T08:00:00.000Z'),
    });

    const page = getSentPage(database, CURRENT_USER_ID, {
      limit: 20,
      cursor: null,
    });

    expect(page.items[0]).toMatchObject({
      recipientNickname: '一位笔友',
      subject: null,
    });
  });

  it('paginates sent letters without duplicates', () => {
    const sharedSentAt = new Date('2026-01-03T08:00:00.000Z');

    ['a', 'b', 'c', 'd', 'e'].forEach((suffix, index) => {
      seedLetter(database, {
        id: `sent-${suffix}`,
        senderId: CURRENT_USER_ID,
        recipientId: 'sender-a',
        subject: `第 ${index + 1} 封`,
        status: 'sent',
        sentAt: sharedSentAt,
        readAt: null,
        createdAt: new Date(`2026-01-0${index + 1}T08:00:00.000Z`),
      });
    });

    const firstPage = getSentPage(database, CURRENT_USER_ID, {
      limit: 2,
      cursor: null,
    });
    const secondQuery = parseMailboxQuery(
      new URLSearchParams({
        limit: '2',
        cursor: firstPage.nextCursor ?? '',
      }),
    );

    expect(firstPage.items.map((letter) => letter.id)).toEqual([
      'sent-e',
      'sent-d',
    ]);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).not.toBeNull();
    expect(secondQuery.ok).toBe(true);

    if (!secondQuery.ok) {
      return;
    }

    const secondPage = getSentPage(
      database,
      CURRENT_USER_ID,
      secondQuery.criteria,
    );

    expect(secondPage.items.map((letter) => letter.id)).toEqual([
      'sent-c',
      'sent-b',
    ]);
    expect(secondPage.hasMore).toBe(true);

    const thirdQuery = parseMailboxQuery(
      new URLSearchParams({
        limit: '2',
        cursor: secondPage.nextCursor ?? '',
      }),
    );

    expect(thirdQuery.ok).toBe(true);

    if (!thirdQuery.ok) {
      return;
    }

    const thirdPage = getSentPage(
      database,
      CURRENT_USER_ID,
      thirdQuery.criteria,
    );

    expect(thirdPage.items.map((letter) => letter.id)).toEqual(['sent-a']);
    expect(thirdPage.hasMore).toBe(false);
    expect(thirdPage.nextCursor).toBeNull();
  });

  it('returns only current user drafts, newest update first, with recipient summary', () => {
    seedLetter(database, {
      id: 'older-draft',
      relationshipId: 'relationship-older',
      senderId: CURRENT_USER_ID,
      recipientId: 'sender-a',
      subject: '旧草稿',
      status: 'draft',
      sentAt: null,
      readAt: null,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
      updatedAt: new Date('2026-01-02T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'newer-draft',
      relationshipId: 'relationship-newer',
      senderId: CURRENT_USER_ID,
      recipientId: 'sender-b',
      subject: '新草稿',
      status: 'draft',
      sentAt: null,
      readAt: null,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
      updatedAt: new Date('2026-01-04T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'someone-elses-draft',
      relationshipId: 'relationship-other',
      senderId: 'sender-a',
      recipientId: 'sender-b',
      subject: '别人的草稿',
      status: 'draft',
      sentAt: null,
      readAt: null,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
      updatedAt: new Date('2026-01-05T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'sent-letter',
      relationshipId: 'relationship-sent',
      senderId: CURRENT_USER_ID,
      recipientId: 'sender-a',
      subject: '已寄出的信',
      status: 'sent',
      sentAt: new Date('2026-01-06T08:00:00.000Z'),
      readAt: null,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
      updatedAt: new Date('2026-01-06T08:00:00.000Z'),
    });

    const page = getDraftsPage(database, CURRENT_USER_ID, {
      limit: 20,
      cursor: null,
    });

    expect(page.items.map((letter) => letter.id)).toEqual([
      'newer-draft',
      'older-draft',
    ]);
    expect(page.items[0]).toEqual({
      id: 'newer-draft',
      relationshipId: 'relationship-newer',
      recipientId: 'sender-b',
      recipientNickname: '远山',
      recipientAvatarUrl: null,
      subject: '新草稿',
      updatedAt: '2026-01-04T08:00:00.000Z',
    });
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it('falls back when a draft recipient profile is missing', () => {
    database
      .insert(schema.users)
      .values({
        id: 'draft-recipient-without-profile',
        email: 'draft-recipient-without-profile@example.com',
      })
      .run();
    seedLetter(database, {
      id: 'draft-without-profile',
      relationshipId: 'relationship-without-profile',
      senderId: CURRENT_USER_ID,
      recipientId: 'draft-recipient-without-profile',
      subject: null,
      status: 'draft',
      sentAt: null,
      readAt: null,
      createdAt: new Date('2026-01-02T08:00:00.000Z'),
    });

    const page = getDraftsPage(database, CURRENT_USER_ID, {
      limit: 20,
      cursor: null,
    });

    expect(page.items[0]).toMatchObject({
      recipientNickname: '一位笔友',
      subject: null,
    });
  });

  it('paginates drafts by updated time, created time and id without duplicates', () => {
    const sharedUpdatedAt = new Date('2026-01-03T08:00:00.000Z');

    ['a', 'b', 'c', 'd', 'e'].forEach((suffix, index) => {
      seedLetter(database, {
        id: `draft-${suffix}`,
        relationshipId: `relationship-${suffix}`,
        senderId: CURRENT_USER_ID,
        recipientId: 'sender-a',
        subject: `第 ${index + 1} 封草稿`,
        status: 'draft',
        sentAt: null,
        readAt: null,
        createdAt: new Date(`2026-01-0${index + 1}T08:00:00.000Z`),
        updatedAt: sharedUpdatedAt,
      });
    });

    const firstPage = getDraftsPage(database, CURRENT_USER_ID, {
      limit: 2,
      cursor: null,
    });
    const secondQuery = parseMailboxQuery(
      new URLSearchParams({
        limit: '2',
        cursor: firstPage.nextCursor ?? '',
      }),
    );

    expect(firstPage.items.map((letter) => letter.id)).toEqual([
      'draft-e',
      'draft-d',
    ]);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).not.toBeNull();
    expect(secondQuery.ok).toBe(true);

    if (!secondQuery.ok) {
      return;
    }

    const secondPage = getDraftsPage(
      database,
      CURRENT_USER_ID,
      secondQuery.criteria,
    );

    expect(secondPage.items.map((letter) => letter.id)).toEqual([
      'draft-c',
      'draft-b',
    ]);
    expect(secondPage.hasMore).toBe(true);

    const thirdQuery = parseMailboxQuery(
      new URLSearchParams({
        limit: '2',
        cursor: secondPage.nextCursor ?? '',
      }),
    );

    expect(thirdQuery.ok).toBe(true);

    if (!thirdQuery.ok) {
      return;
    }

    const thirdPage = getDraftsPage(
      database,
      CURRENT_USER_ID,
      thirdQuery.criteria,
    );

    expect(thirdPage.items.map((letter) => letter.id)).toEqual(['draft-a']);
    expect(thirdPage.hasMore).toBe(false);
    expect(thirdPage.nextCursor).toBeNull();
  });
});
