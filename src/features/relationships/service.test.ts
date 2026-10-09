import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import * as schema from '../../db/schema';
import type { AppDatabase } from '../../db/client';
import {
  encodeRelationshipCursor,
  encodeRelationshipLetterCursor,
  parseRelationshipLettersQuery,
  parseRelationshipQuery,
} from './query';
import {
  endRelationship,
  getRelationshipDetail,
  listRelationshipLetters,
  listRelationships,
} from './service';

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

    CREATE TABLE penpal_requests (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      initial_letter_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      responded_at TIMESTAMP
    );

    CREATE UNIQUE INDEX penpal_requests_pending_unique_idx
      ON penpal_requests(sender_id, receiver_id) WHERE status = 'pending';

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

    CREATE UNIQUE INDEX penpal_relationships_active_unique_idx
      ON penpal_relationships(user_low_id, user_high_id) WHERE status = 'active';

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
  values: {
    id: string;
    nickname: string;
    avatarUrl?: string | null;
    country?: string | null;
    city?: string | null;
    ageRange?: string | null;
  },
): void {
  database
    .insert(schema.users)
    .values({ id: values.id, email: `${values.id}@example.com` })
    .run();
  database
    .insert(schema.profiles)
    .values({
      userId: values.id,
      nickname: values.nickname,
      avatarUrl: values.avatarUrl ?? null,
      country: values.country ?? null,
      city: values.city ?? null,
      ageRange: values.ageRange ?? null,
      onboardingCompleted: true,
    })
    .run();
}

function seedRelationship(
  database: AppDatabase,
  values: {
    id: string;
    userLowId: string;
    userHighId: string;
    status: 'active' | 'ended';
    startedAt: Date;
    endedAt?: Date | null;
    lastLetterAt?: Date | null;
  },
): void {
  database
    .insert(schema.penpalRelationships)
    .values({
      ...values,
      endedAt: values.endedAt ?? null,
      lastLetterAt: values.lastLetterAt ?? null,
    })
    .run();
}

function seedRequest(
  database: AppDatabase,
  values: {
    id: string;
    senderId: string;
    receiverId: string;
    initialLetterId: string | null;
    status: 'pending' | 'accepted' | 'rejected';
    respondedAt?: Date | null;
  },
): void {
  database
    .insert(schema.penpalRequests)
    .values({
      ...values,
      respondedAt: values.respondedAt ?? null,
    })
    .run();
}

function seedLetter(
  database: AppDatabase,
  values: {
    id: string;
    relationshipId: string | null;
    senderId: string;
    recipientId: string;
    subject?: string | null;
    status: 'sent' | 'draft';
    sentAt?: Date | null;
    readAt?: Date | null;
  },
): void {
  const createdAt = values.sentAt ?? new Date('2025-01-01T00:00:00.000Z');

  database
    .insert(schema.letters)
    .values({
      id: values.id,
      relationshipId: values.relationshipId,
      senderId: values.senderId,
      recipientId: values.recipientId,
      subject: values.subject ?? null,
      body: '测试信件正文',
      status: values.status,
      sentAt: values.sentAt ?? null,
      readAt: values.readAt ?? null,
      createdAt,
      updatedAt: createdAt,
    })
    .run();
}

const defaultCriteria = {
  status: null,
  cursor: null,
  limit: 20,
} as const;

const defaultLetterCriteria = {
  cursor: null,
  limit: 20,
} as const;

describe('relationships service', () => {
  let database: AppDatabase;

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    database = createTestDatabase();
    seedUser(database, {
      id: CURRENT_USER_ID,
      nickname: '当前用户',
    });
    seedUser(database, {
      id: 'penpal-a',
      nickname: '青笺',
      avatarUrl: 'https://example.com/a.png',
      country: '中国',
      city: '杭州',
      ageRange: '25-29',
    });
    seedUser(database, {
      id: 'penpal-b',
      nickname: '远山',
      country: '中国',
      city: '成都',
      ageRange: '30-34',
    });
    seedUser(database, {
      id: 'other-user',
      nickname: '路人',
    });
    seedUser(database, {
      id: 'other-penpal',
      nickname: '无关的人',
    });
  });

  it('returns only relationships the current user participates in', () => {
    seedRelationship(database, {
      id: 'relationship-with-a',
      userLowId: CURRENT_USER_ID,
      userHighId: 'penpal-a',
      status: 'active',
      startedAt: new Date('2026-01-02T08:00:00.000Z'),
      lastLetterAt: new Date('2026-01-05T08:00:00.000Z'),
    });
    seedRelationship(database, {
      id: 'relationship-with-b',
      userLowId: 'penpal-b',
      userHighId: CURRENT_USER_ID,
      status: 'active',
      startedAt: new Date('2026-01-03T08:00:00.000Z'),
    });
    seedRelationship(database, {
      id: 'unrelated-relationship',
      userLowId: 'other-user',
      userHighId: 'other-penpal',
      status: 'active',
      startedAt: new Date('2026-01-04T08:00:00.000Z'),
    });

    const page = listRelationships(database, CURRENT_USER_ID, {
      ...defaultCriteria,
    });

    expect(page.items.map((item) => item.id)).toEqual([
      'relationship-with-b',
      'relationship-with-a',
    ]);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
    expect(page.items[0]).toEqual({
      id: 'relationship-with-b',
      status: 'active',
      startedAt: '2026-01-03T08:00:00.000Z',
      endedAt: null,
      lastLetterAt: null,
      peer: {
        id: 'penpal-b',
        nickname: '远山',
        avatarUrl: null,
        country: '中国',
        city: '成都',
        ageRange: '30-34',
      },
    });
    expect(page.items[1]?.peer.nickname).toBe('青笺');
  });

  it('filters by relationship status', () => {
    seedRelationship(database, {
      id: 'active-relationship',
      userLowId: CURRENT_USER_ID,
      userHighId: 'penpal-a',
      status: 'active',
      startedAt: new Date('2026-01-02T08:00:00.000Z'),
    });
    seedRelationship(database, {
      id: 'ended-relationship',
      userLowId: CURRENT_USER_ID,
      userHighId: 'penpal-b',
      status: 'ended',
      startedAt: new Date('2026-01-01T08:00:00.000Z'),
      endedAt: new Date('2026-01-04T08:00:00.000Z'),
    });

    const active = listRelationships(database, CURRENT_USER_ID, {
      ...defaultCriteria,
      status: 'active',
    });
    const ended = listRelationships(database, CURRENT_USER_ID, {
      ...defaultCriteria,
      status: 'ended',
    });

    expect(active.items.map((item) => item.id)).toEqual([
      'active-relationship',
    ]);
    expect(ended.items.map((item) => item.id)).toEqual([
      'ended-relationship',
    ]);
    expect(ended.items[0]?.endedAt).toBe('2026-01-04T08:00:00.000Z');
  });

  it('paginates stable newest-first pages with a cursor', () => {
    seedRelationship(database, {
      id: 'relationship-1',
      userLowId: CURRENT_USER_ID,
      userHighId: 'penpal-a',
      status: 'active',
      startedAt: new Date('2026-01-01T08:00:00.000Z'),
    });
    seedRelationship(database, {
      id: 'relationship-2',
      userLowId: 'penpal-a',
      userHighId: CURRENT_USER_ID,
      status: 'active',
      startedAt: new Date('2026-01-02T08:00:00.000Z'),
    });
    seedRelationship(database, {
      id: 'relationship-3',
      userLowId: CURRENT_USER_ID,
      userHighId: 'penpal-b',
      status: 'active',
      startedAt: new Date('2026-01-03T08:00:00.000Z'),
    });

    const firstPage = listRelationships(database, CURRENT_USER_ID, {
      ...defaultCriteria,
      limit: 2,
    });

    expect(firstPage.items.map((item) => item.id)).toEqual([
      'relationship-3',
      'relationship-2',
    ]);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).not.toBeNull();

    const parsed = parseRelationshipQuery(
      new URLSearchParams({ cursor: firstPage.nextCursor ?? '' }),
    );

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      return;
    }

    const secondPage = listRelationships(
      database,
      CURRENT_USER_ID,
      parsed.criteria,
    );

    expect(secondPage.items.map((item) => item.id)).toEqual([
      'relationship-1',
    ]);
    expect(secondPage.hasMore).toBe(false);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('falls back to a placeholder when the peer profile is missing', () => {
    database
      .insert(schema.users)
      .values({ id: 'penpal-without-profile', email: 'ghost@example.com' })
      .run();
    seedRelationship(database, {
      id: 'relationship-without-profile',
      userLowId: CURRENT_USER_ID,
      userHighId: 'penpal-without-profile',
      status: 'active',
      startedAt: new Date('2026-01-02T08:00:00.000Z'),
    });

    const page = listRelationships(database, CURRENT_USER_ID, {
      ...defaultCriteria,
    });

    expect(page.items[0]?.peer).toEqual({
      id: 'penpal-without-profile',
      nickname: '一位笔友',
      avatarUrl: null,
      country: '',
      city: '',
      ageRange: '',
    });
  });

  it('returns relationship detail only to participants', () => {
    seedRelationship(database, {
      id: 'relationship-with-a',
      userLowId: 'penpal-a',
      userHighId: CURRENT_USER_ID,
      status: 'active',
      startedAt: new Date('2026-01-02T08:00:00.000Z'),
      lastLetterAt: new Date('2026-01-05T08:00:00.000Z'),
    });

    expect(
      getRelationshipDetail(
        database,
        CURRENT_USER_ID,
        'relationship-with-a',
      ),
    ).toEqual({
      id: 'relationship-with-a',
      status: 'active',
      startedAt: '2026-01-02T08:00:00.000Z',
      endedAt: null,
      lastLetterAt: '2026-01-05T08:00:00.000Z',
      peer: {
        id: 'penpal-a',
        nickname: '青笺',
        avatarUrl: 'https://example.com/a.png',
        country: '中国',
        city: '杭州',
        ageRange: '25-29',
      },
    });
    expect(
      getRelationshipDetail(database, 'other-user', 'relationship-with-a'),
    ).toBeNull();
    expect(
      getRelationshipDetail(database, CURRENT_USER_ID, 'missing-relationship'),
    ).toBeNull();
  });

  it('ends an active relationship for a participant', () => {
    seedRelationship(database, {
      id: 'relationship-with-a',
      userLowId: CURRENT_USER_ID,
      userHighId: 'penpal-a',
      status: 'active',
      startedAt: new Date('2026-01-02T08:00:00.000Z'),
      lastLetterAt: new Date('2026-01-05T08:00:00.000Z'),
    });

    const result = endRelationship(
      database,
      'penpal-a',
      'relationship-with-a',
    );

    expect(result).toMatchObject({
      ok: true,
      alreadyEnded: false,
      relationship: {
        id: 'relationship-with-a',
        status: 'ended',
        startedAt: '2026-01-02T08:00:00.000Z',
        lastLetterAt: '2026-01-05T08:00:00.000Z',
        peer: {
          id: CURRENT_USER_ID,
          nickname: '当前用户',
        },
      },
    });

    if (!result.ok) {
      return;
    }

    expect(result.relationship.endedAt).not.toBeNull();

    const stored = database
      .select({
        status: schema.penpalRelationships.status,
        endedAt: schema.penpalRelationships.endedAt,
      })
      .from(schema.penpalRelationships)
      .where(
        eq(schema.penpalRelationships.id, 'relationship-with-a'),
      )
      .get();

    expect(stored?.status).toBe('ended');
    expect(stored?.endedAt?.toISOString()).toBe(
      result.relationship.endedAt,
    );
  });

  it('repeated end is idempotent and preserves ended_at', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T08:00:00.000Z'));

    seedRelationship(database, {
      id: 'relationship-with-a',
      userLowId: CURRENT_USER_ID,
      userHighId: 'penpal-a',
      status: 'active',
      startedAt: new Date('2026-01-02T08:00:00.000Z'),
    });

    const first = endRelationship(
      database,
      CURRENT_USER_ID,
      'relationship-with-a',
    );

    expect(first).toMatchObject({
      ok: true,
      alreadyEnded: false,
    });

    if (!first.ok) {
      return;
    }

    expect(first.relationship.endedAt).toBe(
      '2026-02-01T08:00:00.000Z',
    );

    vi.setSystemTime(new Date('2026-02-02T08:00:00.000Z'));

    const second = endRelationship(
      database,
      'penpal-a',
      'relationship-with-a',
    );

    expect(second).toMatchObject({
      ok: true,
      alreadyEnded: true,
      relationship: {
        status: 'ended',
        endedAt: '2026-02-01T08:00:00.000Z',
      },
    });

    const stored = database
      .select({
        endedAt: schema.penpalRelationships.endedAt,
      })
      .from(schema.penpalRelationships)
      .where(
        eq(schema.penpalRelationships.id, 'relationship-with-a'),
      )
      .get();

    expect(stored?.endedAt?.toISOString()).toBe(
      '2026-02-01T08:00:00.000Z',
    );
  });

  it('does not let non-participants end a relationship', () => {
    seedRelationship(database, {
      id: 'relationship-with-a',
      userLowId: CURRENT_USER_ID,
      userHighId: 'penpal-a',
      status: 'active',
      startedAt: new Date('2026-01-02T08:00:00.000Z'),
    });

    expect(
      endRelationship(
        database,
        'other-user',
        'relationship-with-a',
      ),
    ).toMatchObject({
      ok: false,
      code: 'forbidden',
    });

    const stored = database
      .select({ status: schema.penpalRelationships.status })
      .from(schema.penpalRelationships)
      .where(
        eq(schema.penpalRelationships.id, 'relationship-with-a'),
      )
      .get();

    expect(stored?.status).toBe('active');
  });

  it('returns relationship_not_found when ending a missing relationship', () => {
    expect(
      endRelationship(
        database,
        CURRENT_USER_ID,
        'missing-relationship',
      ),
    ).toMatchObject({
      ok: false,
      code: 'relationship_not_found',
    });
  });

  it('lists sent letters from the accepted request and relationship', () => {
    const startedAt = new Date('2026-01-02T08:00:00.000Z');

    seedRelationship(database, {
      id: 'relationship-with-a',
      userLowId: CURRENT_USER_ID,
      userHighId: 'penpal-a',
      status: 'active',
      startedAt,
    });
    seedRequest(database, {
      id: 'accepted-request',
      senderId: CURRENT_USER_ID,
      receiverId: 'penpal-a',
      initialLetterId: 'first-letter',
      status: 'accepted',
      respondedAt: startedAt,
    });
    seedLetter(database, {
      id: 'first-letter',
      relationshipId: null,
      senderId: CURRENT_USER_ID,
      recipientId: 'penpal-a',
      subject: '你好',
      status: 'sent',
      sentAt: new Date('2026-01-01T08:00:00.000Z'),
      readAt: new Date('2026-01-02T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'reply-letter',
      relationshipId: 'relationship-with-a',
      senderId: 'penpal-a',
      recipientId: CURRENT_USER_ID,
      subject: '很高兴收到你的信',
      status: 'sent',
      sentAt: new Date('2026-01-03T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'draft-letter',
      relationshipId: 'relationship-with-a',
      senderId: CURRENT_USER_ID,
      recipientId: 'penpal-a',
      status: 'draft',
    });
    seedLetter(database, {
      id: 'unlinked-letter',
      relationshipId: null,
      senderId: CURRENT_USER_ID,
      recipientId: 'penpal-a',
      status: 'sent',
      sentAt: new Date('2026-01-04T08:00:00.000Z'),
    });
    seedRelationship(database, {
      id: 'other-relationship',
      userLowId: CURRENT_USER_ID,
      userHighId: 'penpal-b',
      status: 'active',
      startedAt: new Date('2026-01-02T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'other-relationship-letter',
      relationshipId: 'other-relationship',
      senderId: CURRENT_USER_ID,
      recipientId: 'penpal-b',
      status: 'sent',
      sentAt: new Date('2026-01-05T08:00:00.000Z'),
    });

    const page = listRelationshipLetters(
      database,
      CURRENT_USER_ID,
      'relationship-with-a',
      defaultLetterCriteria,
    );

    expect(page?.items.map((item) => item.id)).toEqual([
      'reply-letter',
      'first-letter',
    ]);
    expect(page?.items[0]).toEqual({
      id: 'reply-letter',
      senderId: 'penpal-a',
      recipientId: CURRENT_USER_ID,
      subject: '很高兴收到你的信',
      sentAt: '2026-01-03T08:00:00.000Z',
      readAt: null,
      isMine: false,
    });
    expect(page?.items[1]?.isMine).toBe(true);
    expect(page?.hasMore).toBe(false);
    expect(page?.nextCursor).toBeNull();
  });

  it('paginates letters with a stable newest-first cursor', () => {
    seedRelationship(database, {
      id: 'relationship-with-a',
      userLowId: CURRENT_USER_ID,
      userHighId: 'penpal-a',
      status: 'active',
      startedAt: new Date('2026-01-01T08:00:00.000Z'),
    });

    const sameTime = new Date('2026-01-04T08:00:00.000Z');

    seedLetter(database, {
      id: 'letter-a',
      relationshipId: 'relationship-with-a',
      senderId: CURRENT_USER_ID,
      recipientId: 'penpal-a',
      status: 'sent',
      sentAt: new Date('2026-01-02T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'letter-b',
      relationshipId: 'relationship-with-a',
      senderId: 'penpal-a',
      recipientId: CURRENT_USER_ID,
      status: 'sent',
      sentAt: new Date('2026-01-03T08:00:00.000Z'),
    });
    seedLetter(database, {
      id: 'letter-c',
      relationshipId: 'relationship-with-a',
      senderId: CURRENT_USER_ID,
      recipientId: 'penpal-a',
      status: 'sent',
      sentAt: sameTime,
    });
    seedLetter(database, {
      id: 'letter-d',
      relationshipId: 'relationship-with-a',
      senderId: 'penpal-a',
      recipientId: CURRENT_USER_ID,
      status: 'sent',
      sentAt: sameTime,
    });

    const firstPage = listRelationshipLetters(
      database,
      CURRENT_USER_ID,
      'relationship-with-a',
      {
        ...defaultLetterCriteria,
        limit: 2,
      },
    );

    expect(firstPage?.items.map((item) => item.id)).toEqual([
      'letter-d',
      'letter-c',
    ]);
    expect(firstPage?.hasMore).toBe(true);
    expect(firstPage?.nextCursor).not.toBeNull();

    const parsed = parseRelationshipLettersQuery(
      new URLSearchParams({ cursor: firstPage?.nextCursor ?? '' }),
    );

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      return;
    }

    const secondPage = listRelationshipLetters(
      database,
      CURRENT_USER_ID,
      'relationship-with-a',
      parsed.criteria,
    );

    expect(secondPage?.items.map((item) => item.id)).toEqual([
      'letter-b',
      'letter-a',
    ]);
    expect(secondPage?.hasMore).toBe(false);
    expect(secondPage?.nextCursor).toBeNull();
  });

  it('does not expose letters to non-participants', () => {
    seedRelationship(database, {
      id: 'relationship-with-a',
      userLowId: CURRENT_USER_ID,
      userHighId: 'penpal-a',
      status: 'active',
      startedAt: new Date('2026-01-02T08:00:00.000Z'),
    });

    expect(
      listRelationshipLetters(
        database,
        'other-user',
        'relationship-with-a',
        defaultLetterCriteria,
      ),
    ).toBeNull();
  });
});

describe('relationships query', () => {
  it('parses status, limit and cursor and rejects invalid input', () => {
    const ok = parseRelationshipQuery(
      new URLSearchParams({ status: 'ended', limit: '10' }),
    );

    expect(ok).toEqual({
      ok: true,
      criteria: { status: 'ended', cursor: null, limit: 10 },
    });

    const invalidStatus = parseRelationshipQuery(
      new URLSearchParams({ status: 'archived' }),
    );
    const invalidLimit = parseRelationshipQuery(
      new URLSearchParams({ limit: '0' }),
    );
    const invalidCursor = parseRelationshipQuery(
      new URLSearchParams({ cursor: 'not-a-cursor' }),
    );

    expect(invalidStatus.ok).toBe(false);
    expect(invalidLimit.ok).toBe(false);
    expect(invalidCursor.ok).toBe(false);
  });

  it('round-trips an encoded cursor', () => {
    const cursor = {
      type: 'started_at' as const,
      startedAt: '2026-01-02T08:00:00.000Z',
      id: 'relationship-1',
    };
    const result = parseRelationshipQuery(
      new URLSearchParams({ cursor: encodeRelationshipCursor(cursor) }),
    );

    expect(result).toEqual({
      ok: true,
      criteria: { status: null, cursor, limit: 20 },
    });
  });
});

describe('relationship letters query', () => {
  it('parses limit and cursor and rejects invalid input', () => {
    const defaults = parseRelationshipLettersQuery(new URLSearchParams());

    expect(defaults).toEqual({
      ok: true,
      criteria: { cursor: null, limit: 20 },
    });

    const invalidLimit = parseRelationshipLettersQuery(
      new URLSearchParams({ limit: '51' }),
    );
    const invalidCursor = parseRelationshipLettersQuery(
      new URLSearchParams({ cursor: 'not-a-cursor' }),
    );

    expect(invalidLimit.ok).toBe(false);
    expect(invalidCursor.ok).toBe(false);
  });

  it('round-trips an encoded letter cursor', () => {
    const cursor = {
      type: 'sent_at' as const,
      sentAt: '2026-01-02T08:00:00.000Z',
      id: 'letter-1',
    };
    const result = parseRelationshipLettersQuery(
      new URLSearchParams({
        cursor: encodeRelationshipLetterCursor(cursor),
      }),
    );

    expect(result).toEqual({
      ok: true,
      criteria: { cursor, limit: 20 },
    });
  });
});
