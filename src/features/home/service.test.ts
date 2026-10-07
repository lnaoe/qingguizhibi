import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import * as schema from '../../db/schema';
import type { AppDatabase } from '../../db/client';
import { getRecentInboxLetters } from './service';

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
      relationship_id TEXT NOT NULL,
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
    senderId: string;
    recipientId: string;
    subject: string | null;
    status: 'draft' | 'sent';
    sentAt: Date | null;
    readAt: Date | null;
    createdAt: Date;
  },
): void {
  database
    .insert(schema.letters)
    .values({
      ...values,
      relationshipId: `relationship-${values.id}`,
      body: '这是一封信。',
    })
    .run();
}

describe('home service', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedUser(database, CURRENT_USER_ID, '当前用户');
    seedUser(database, 'sender-a', '青笺', 'https://example.com/a.png');
    seedUser(database, 'sender-b', '远山');
    seedUser(database, 'other-recipient', '另一位用户');
  });

  it('returns only the current user sent letters, newest first', () => {
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
      id: 'draft-inbox-letter',
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

    const letters = getRecentInboxLetters(
      database,
      CURRENT_USER_ID,
    );

    expect(letters.map((letter) => letter.id)).toEqual([
      'newer-inbox-letter',
      'older-inbox-letter',
    ]);
    expect(letters[0]).toEqual({
      id: 'newer-inbox-letter',
      senderId: 'sender-b',
      senderNickname: '远山',
      senderAvatarUrl: null,
      subject: '新信',
      sentAt: '2026-01-03T08:00:00.000Z',
      isUnread: true,
    });
    expect(letters[1]?.isUnread).toBe(false);
  });

  it('limits recent letters and falls back when the sender profile is missing', () => {
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
    seedLetter(database, {
      id: 'newer-letter',
      senderId: 'sender-a',
      recipientId: CURRENT_USER_ID,
      subject: '新信',
      status: 'sent',
      sentAt: new Date('2026-01-03T08:00:00.000Z'),
      readAt: null,
      createdAt: new Date('2026-01-03T08:00:00.000Z'),
    });

    const letters = getRecentInboxLetters(
      database,
      CURRENT_USER_ID,
      1,
    );

    expect(letters).toHaveLength(1);
    expect(letters[0]?.id).toBe('newer-letter');

    const fallbackLetters = getRecentInboxLetters(
      database,
      CURRENT_USER_ID,
      2,
    );

    expect(fallbackLetters.find((letter) => letter.id === 'letter-without-profile'))
      .toMatchObject({
        senderNickname: '一位笔友',
        subject: null,
      });
  });
});
