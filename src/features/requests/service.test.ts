import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import * as schema from '../../db/schema';
import type { AppDatabase } from '../../db/client';
import { createFirstContact } from './service';

type UserStatus = (typeof schema.userStatusValues)[number];
type ProfileVisibility = (typeof schema.profileVisibilityValues)[number];

interface SeedUserOptions {
  status?: UserStatus;
  visibility?: ProfileVisibility;
  onboardingCompleted?: boolean;
  nickname?: string;
}

const SENDER_ID = 'sender';
const RECEIVER_ID = 'receiver';

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
  options: SeedUserOptions = {},
): void {
  database
    .insert(schema.users)
    .values({
      id,
      email: `${id}@example.com`,
      status: options.status ?? 'active',
    })
    .run();

  database
    .insert(schema.profiles)
    .values({
      userId: id,
      nickname: options.nickname ?? id,
      visibility: options.visibility ?? 'public',
      onboardingCompleted: options.onboardingCompleted ?? true,
    })
    .run();
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    receiver_id: RECEIVER_ID,
    subject: '你好',
    body: '很高兴认识你。',
    ...overrides,
  };
}

function countRows(database: AppDatabase, table: string): number {
  const row = database.$client
    .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
    .get() as { count: number };

  return row.count;
}

describe('createFirstContact', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedUser(database, SENDER_ID, { nickname: '小明' });
    seedUser(database, RECEIVER_ID, { nickname: '小红' });
  });

  it('creates the initial letter, pending request and notification without a relationship', () => {
    const result = createFirstContact(database, SENDER_ID, validInput());

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const letterRows = database.select().from(schema.letters).all();
    const requestRows = database.select().from(schema.penpalRequests).all();
    const notificationRows = database
      .select()
      .from(schema.notifications)
      .all();

    expect(letterRows).toHaveLength(1);
    expect(letterRows[0]).toMatchObject({
      id: result.letter.id,
      relationshipId: null,
      senderId: SENDER_ID,
      recipientId: RECEIVER_ID,
      subject: '你好',
      body: '很高兴认识你。',
      status: 'sent',
      readAt: null,
    });
    expect(letterRows[0].sentAt).toBeInstanceOf(Date);

    expect(requestRows).toHaveLength(1);
    expect(requestRows[0]).toMatchObject({
      id: result.request.id,
      senderId: SENDER_ID,
      receiverId: RECEIVER_ID,
      initialLetterId: result.letter.id,
      status: 'pending',
      respondedAt: null,
    });

    expect(notificationRows).toHaveLength(1);
    expect(notificationRows[0]).toMatchObject({
      userId: RECEIVER_ID,
      type: 'penpal_request',
      title: '小明 给你寄来了一封信',
      body: '你好',
      referenceType: 'penpal_request',
      referenceId: result.request.id,
      readAt: null,
    });

    expect(countRows(database, 'penpal_relationships')).toBe(0);
  });

  it('blocks a duplicate pending request without creating extra rows', () => {
    const first = createFirstContact(database, SENDER_ID, validInput());
    const second = createFirstContact(database, SENDER_ID, validInput());

    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, code: 'duplicate_request' });
    expect(countRows(database, 'letters')).toBe(1);
    expect(countRows(database, 'penpal_requests')).toBe(1);
    expect(countRows(database, 'notifications')).toBe(1);
  });

  it('rejects sending a request to yourself', () => {
    const result = createFirstContact(
      database,
      SENDER_ID,
      validInput({ receiver_id: SENDER_ID }),
    );

    expect(result).toMatchObject({ ok: false, code: 'self_request' });
    expect(countRows(database, 'letters')).toBe(0);
  });

  it('rejects requests when either side has blocked the other', () => {
    database
      .insert(schema.blocks)
      .values({
        id: 'block-1',
        blockerId: RECEIVER_ID,
        blockedId: SENDER_ID,
      })
      .run();

    const result = createFirstContact(database, SENDER_ID, validInput());

    expect(result).toMatchObject({ ok: false, code: 'blocked' });
    expect(countRows(database, 'penpal_requests')).toBe(0);
  });

  it('rejects requests when an active relationship already exists', () => {
    database
      .insert(schema.penpalRelationships)
      .values({
        id: 'relationship-1',
        userLowId: RECEIVER_ID,
        userHighId: SENDER_ID,
        status: 'active',
      })
      .run();

    const result = createFirstContact(database, SENDER_ID, validInput());

    expect(result).toMatchObject({
      ok: false,
      code: 'active_relationship',
    });
    expect(countRows(database, 'penpal_requests')).toBe(0);
  });

  it('requires the sender to have finished onboarding', () => {
    database
      .update(schema.profiles)
      .set({ onboardingCompleted: false })
      .run();

    const result = createFirstContact(database, SENDER_ID, validInput());

    expect(result).toMatchObject({ ok: false, code: 'sender_not_ready' });
    expect(countRows(database, 'letters')).toBe(0);
  });

  it('hides receivers that are not visible or not active', () => {
    database
      .update(schema.profiles)
      .set({ visibility: 'hidden' })
      .where(eq(schema.profiles.userId, RECEIVER_ID))
      .run();

    expect(
      createFirstContact(database, SENDER_ID, validInput()),
    ).toMatchObject({ ok: false, code: 'receiver_not_found' });
    expect(countRows(database, 'penpal_requests')).toBe(0);
  });

  it('returns validation errors for invalid input', () => {
    const result = createFirstContact(
      database,
      SENDER_ID,
      validInput({ subject: '', body: '' }),
    );

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.code).toBe('validation_error');
      expect(result.errors?.subject).toBeDefined();
      expect(result.errors?.body).toBeDefined();
    }

    expect(countRows(database, 'letters')).toBe(0);
  });
});
