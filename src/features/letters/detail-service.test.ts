import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import type { AppDatabase } from '../../db/client';
import * as schema from '../../db/schema';
import { getLetterDetail, markLetterRead } from './detail-service';

const SENT_AT = new Date('2026-01-03T08:00:00.000Z');

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

    CREATE TABLE penpal_relationships (
      id TEXT PRIMARY KEY,
      user_low_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_high_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ended_at TIMESTAMP,
      last_letter_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE letters (
      id TEXT PRIMARY KEY,
      relationship_id TEXT REFERENCES penpal_relationships(id) ON DELETE CASCADE,
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

function seedRelationship(database: AppDatabase): void {
  database
    .insert(schema.penpalRelationships)
    .values({
      id: 'relationship-1',
      userLowId: 'user-a',
      userHighId: 'user-b',
      status: 'active',
    })
    .run();
}

function seedLetter(
  database: AppDatabase,
  overrides: Partial<typeof schema.letters.$inferInsert> = {},
): void {
  database
    .insert(schema.letters)
    .values({
      id: 'letter-1',
      relationshipId: 'relationship-1',
      senderId: 'user-a',
      recipientId: 'user-b',
      subject: '冬日来信',
      body: '最近好吗？\n这里一切都好。',
      status: 'sent',
      sentAt: SENT_AT,
      readAt: null,
      createdAt: SENT_AT,
      updatedAt: SENT_AT,
      ...overrides,
    })
    .run();
}

describe('letter detail service', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedUser(database, 'user-a', '青笺', 'https://example.com/a.png');
    seedUser(database, 'user-b', '远山');
    seedUser(database, 'user-c', '路人');
    seedRelationship(database);
  });

  it('returns a sent letter to both participants with profile summaries', () => {
    seedLetter(database);

    const recipientResult = getLetterDetail(database, 'user-b', 'letter-1');
    const senderResult = getLetterDetail(database, 'user-a', 'letter-1');

    expect(recipientResult).toEqual({
      ok: true,
      letter: {
        id: 'letter-1',
        relationshipId: 'relationship-1',
        sender: {
          id: 'user-a',
          nickname: '青笺',
          avatarUrl: 'https://example.com/a.png',
        },
        recipient: {
          id: 'user-b',
          nickname: '远山',
          avatarUrl: null,
        },
        subject: '冬日来信',
        body: '最近好吗？\n这里一切都好。',
        status: 'sent',
        sentAt: SENT_AT,
        readAt: null,
        createdAt: SENT_AT,
        updatedAt: SENT_AT,
        replyRelationshipId: 'relationship-1',
      },
    });
    expect(senderResult.ok).toBe(true);
  });

  it('resolves an active relationship for an accepted first letter', () => {
    seedLetter(database, {
      relationshipId: null,
    });

    const result = getLetterDetail(database, 'user-b', 'letter-1');

    expect(result).toMatchObject({
      ok: true,
      letter: {
        relationshipId: null,
        replyRelationshipId: 'relationship-1',
      },
    });
  });

  it('does not offer a reply after the relationship ends', () => {
    seedLetter(database);
    database
      .update(schema.penpalRelationships)
      .set({
        status: 'ended',
        endedAt: new Date('2026-01-04T08:00:00.000Z'),
      })
      .run();

    const result = getLetterDetail(database, 'user-b', 'letter-1');

    expect(result).toMatchObject({
      ok: true,
      letter: {
        replyRelationshipId: null,
      },
    });
  });

  it('does not expose a sent letter to a non-participant or expose drafts', () => {
    seedLetter(database);
    seedLetter(database, {
      id: 'draft-1',
      status: 'draft',
      sentAt: null,
    });

    expect(getLetterDetail(database, 'user-c', 'letter-1')).toEqual({
      ok: false,
      code: 'letter_not_found',
      message: '找不到这封信',
    });
    expect(getLetterDetail(database, 'user-b', 'draft-1')).toEqual({
      ok: false,
      code: 'letter_not_found',
      message: '找不到这封信',
    });
    expect(getLetterDetail(database, 'user-a', 'missing-letter')).toEqual({
      ok: false,
      code: 'letter_not_found',
      message: '找不到这封信',
    });
  });

  it('marks a sent letter read for its recipient', () => {
    seedLetter(database);

    const firstResult = markLetterRead(database, 'user-b', 'letter-1');

    expect(firstResult.ok).toBe(true);

    if (!firstResult.ok) {
      return;
    }

    expect(firstResult.alreadyRead).toBe(false);
    expect(firstResult.letter.readAt).toBeInstanceOf(Date);

    const readAt = firstResult.letter.readAt;
    const stored = database.select().from(schema.letters).all()[0];

    expect(stored?.readAt).toEqual(readAt);

    const repeatedResult = markLetterRead(database, 'user-b', 'letter-1');

    expect(repeatedResult.ok).toBe(true);

    if (!repeatedResult.ok) {
      return;
    }

    expect(repeatedResult.alreadyRead).toBe(true);
    expect(repeatedResult.letter.readAt).toEqual(readAt);
  });

  it('rejects read marking by the sender or a non-participant', () => {
    seedLetter(database);

    expect(markLetterRead(database, 'user-a', 'letter-1')).toEqual({
      ok: false,
      code: 'forbidden',
      message: '只有收信人可以标记这封信为已读',
    });
    expect(markLetterRead(database, 'user-c', 'letter-1')).toEqual({
      ok: false,
      code: 'letter_not_found',
      message: '找不到这封信',
    });
  });

  it('falls back when a participant profile is missing', () => {
    database
      .insert(schema.users)
      .values({
        id: 'user-without-profile',
        email: 'user-without-profile@example.com',
      })
      .run();
    seedLetter(database, {
      senderId: 'user-without-profile',
      recipientId: 'user-b',
    });

    const result = getLetterDetail(database, 'user-b', 'letter-1');

    expect(result).toMatchObject({
      ok: true,
      letter: {
        sender: {
          id: 'user-without-profile',
          nickname: '一位笔友',
          avatarUrl: null,
        },
      },
    });
  });
});
