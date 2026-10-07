import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import * as schema from '../../db/schema';
import type { AppDatabase } from '../../db/client';
import { acceptPenpalRequest, rejectPenpalRequest } from './respond-service';

const SENDER_ID = 'sender';
const RECEIVER_ID = 'receiver';
const OUTSIDER_ID = 'outsider';
const REQUEST_ID = 'request-1';

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

    CREATE TABLE blocks (
      id TEXT PRIMARY KEY,
      blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(blocker_id, blocked_id)
    );
  `);

  return drizzle(sqlite, { schema: { ...schema, ...authSchema } });
}

function seedUser(
  database: AppDatabase,
  id: string,
  nickname: string,
): void {
  database
    .insert(schema.users)
    .values({ id, email: `${id}@example.com` })
    .run();
  database
    .insert(schema.profiles)
    .values({ userId: id, nickname, onboardingCompleted: true })
    .run();
}

function seedPendingRequest(database: AppDatabase): void {
  database
    .insert(schema.penpalRequests)
    .values({
      id: REQUEST_ID,
      senderId: SENDER_ID,
      receiverId: RECEIVER_ID,
      initialLetterId: 'letter-1',
      status: 'pending',
    })
    .run();
}

function countRows(database: AppDatabase, table: string): number {
  const row = database.$client
    .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
    .get() as { count: number };

  return row.count;
}

function readRequest(database: AppDatabase) {
  return database
    .select()
    .from(schema.penpalRequests)
    .where(eq(schema.penpalRequests.id, REQUEST_ID))
    .get();
}

describe('acceptPenpalRequest', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedUser(database, SENDER_ID, '小明');
    seedUser(database, RECEIVER_ID, '小红');
    seedUser(database, OUTSIDER_ID, '路人');
    seedPendingRequest(database);
  });

  it('only lets the receiver accept', () => {
    expect(
      acceptPenpalRequest(database, SENDER_ID, REQUEST_ID),
    ).toMatchObject({ ok: false, code: 'forbidden' });
    expect(
      acceptPenpalRequest(database, OUTSIDER_ID, REQUEST_ID),
    ).toMatchObject({ ok: false, code: 'forbidden' });
    expect(countRows(database, 'penpal_relationships')).toBe(0);
  });

  it('creates exactly one active relationship and notifies the sender', () => {
    const result = acceptPenpalRequest(database, RECEIVER_ID, REQUEST_ID);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.alreadyAccepted).toBe(false);
    expect(result.request).toMatchObject({
      id: REQUEST_ID,
      status: 'accepted',
    });
    expect(result.request.respondedAt).toBeInstanceOf(Date);

    const relationships = database
      .select()
      .from(schema.penpalRelationships)
      .all();

    expect(relationships).toHaveLength(1);
    expect(relationships[0]).toMatchObject({
      userLowId: RECEIVER_ID,
      userHighId: SENDER_ID,
      status: 'active',
      endedAt: null,
    });
    expect(relationships[0].startedAt).toBeInstanceOf(Date);

    const notifications = database
      .select()
      .from(schema.notifications)
      .all();

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      userId: SENDER_ID,
      type: 'request_accepted',
      title: '小红 接受了你的来信',
      referenceType: 'penpal_request',
      referenceId: REQUEST_ID,
      readAt: null,
    });

    expect(readRequest(database)).toMatchObject({ status: 'accepted' });
  });

  it('is idempotent and never creates a second relationship', () => {
    const first = acceptPenpalRequest(database, RECEIVER_ID, REQUEST_ID);
    const second = acceptPenpalRequest(database, RECEIVER_ID, REQUEST_ID);

    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: true, alreadyAccepted: true });
    expect(countRows(database, 'penpal_relationships')).toBe(1);
    expect(countRows(database, 'notifications')).toBe(1);
  });

  it('reuses an existing active relationship instead of creating another', () => {
    database
      .insert(schema.penpalRelationships)
      .values({
        id: 'relationship-1',
        userLowId: RECEIVER_ID,
        userHighId: SENDER_ID,
        status: 'active',
      })
      .run();

    const result = acceptPenpalRequest(database, RECEIVER_ID, REQUEST_ID);

    expect(result.ok).toBe(true);
    expect(countRows(database, 'penpal_relationships')).toBe(1);
    expect(readRequest(database)).toMatchObject({ status: 'accepted' });
  });

  it('refuses to accept when either side has blocked the other', () => {
    database
      .insert(schema.blocks)
      .values({
        id: 'block-1',
        blockerId: SENDER_ID,
        blockedId: RECEIVER_ID,
      })
      .run();

    const result = acceptPenpalRequest(database, RECEIVER_ID, REQUEST_ID);

    expect(result).toMatchObject({ ok: false, code: 'blocked' });
    expect(countRows(database, 'penpal_relationships')).toBe(0);
    expect(readRequest(database)).toMatchObject({ status: 'pending' });
  });

  it('conflicts when the request was already rejected', () => {
    rejectPenpalRequest(database, RECEIVER_ID, REQUEST_ID);

    expect(
      acceptPenpalRequest(database, RECEIVER_ID, REQUEST_ID),
    ).toMatchObject({ ok: false, code: 'request_not_pending' });
    expect(countRows(database, 'penpal_relationships')).toBe(0);
  });

  it('returns not found for an unknown request', () => {
    expect(
      acceptPenpalRequest(database, RECEIVER_ID, 'missing'),
    ).toMatchObject({ ok: false, code: 'request_not_found' });
  });
});

describe('rejectPenpalRequest', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedUser(database, SENDER_ID, '小明');
    seedUser(database, RECEIVER_ID, '小红');
    seedUser(database, OUTSIDER_ID, '路人');
    seedPendingRequest(database);
  });

  it('only lets the receiver reject', () => {
    expect(
      rejectPenpalRequest(database, SENDER_ID, REQUEST_ID),
    ).toMatchObject({ ok: false, code: 'forbidden' });
    expect(readRequest(database)).toMatchObject({ status: 'pending' });
  });

  it('marks the request rejected without creating a relationship', () => {
    const result = rejectPenpalRequest(database, RECEIVER_ID, REQUEST_ID);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.alreadyRejected).toBe(false);
    expect(result.request).toMatchObject({
      id: REQUEST_ID,
      status: 'rejected',
    });
    expect(result.request.respondedAt).toBeInstanceOf(Date);

    expect(readRequest(database)).toMatchObject({ status: 'rejected' });
    expect(countRows(database, 'penpal_relationships')).toBe(0);
    expect(countRows(database, 'notifications')).toBe(0);
  });

  it('is idempotent on repeated reject', () => {
    const first = rejectPenpalRequest(database, RECEIVER_ID, REQUEST_ID);
    const respondedAt = readRequest(database)?.respondedAt;
    const second = rejectPenpalRequest(database, RECEIVER_ID, REQUEST_ID);

    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: true, alreadyRejected: true });
    expect(readRequest(database)?.respondedAt).toEqual(respondedAt);
    expect(countRows(database, 'notifications')).toBe(0);
  });

  it('conflicts when the request was already accepted', () => {
    acceptPenpalRequest(database, RECEIVER_ID, REQUEST_ID);

    expect(
      rejectPenpalRequest(database, RECEIVER_ID, REQUEST_ID),
    ).toMatchObject({ ok: false, code: 'request_not_pending' });
    expect(readRequest(database)).toMatchObject({ status: 'accepted' });
  });

  it('returns not found for an unknown request', () => {
    expect(
      rejectPenpalRequest(database, RECEIVER_ID, 'missing'),
    ).toMatchObject({ ok: false, code: 'request_not_found' });
  });
});
