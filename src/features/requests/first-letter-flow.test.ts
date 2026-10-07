import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import * as schema from '../../db/schema';
import type { AppDatabase } from '../../db/client';
import { createFirstContact } from './service';
import { acceptPenpalRequest, rejectPenpalRequest } from './respond-service';

const AUTHOR_ID = 'author';
const RECEIVER_ID = 'receiver';

const LETTER = {
  receiver_id: RECEIVER_ID,
  subject: '你好',
  body: '很高兴认识你，想和你做笔友。',
};

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

function seedReadyUser(
  database: AppDatabase,
  id: string,
  nickname: string,
): void {
  database
    .insert(schema.users)
    .values({ id, email: `${id}@example.com`, status: 'active' })
    .run();
  database
    .insert(schema.profiles)
    .values({
      userId: id,
      nickname,
      visibility: 'public',
      onboardingCompleted: true,
    })
    .run();
}

function activeRelationships(database: AppDatabase) {
  return database
    .select()
    .from(schema.penpalRelationships)
    .where(eq(schema.penpalRelationships.status, 'active'))
    .all();
}

function notificationsFor(database: AppDatabase, userId: string) {
  return database
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .all();
}

describe('first letter flow', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedReadyUser(database, AUTHOR_ID, '写信人');
    seedReadyUser(database, RECEIVER_ID, '收信人');
  });

  it('runs A sends -> B notified -> B accepts -> relationship exists', () => {
    const created = createFirstContact(database, AUTHOR_ID, LETTER);

    expect(created.ok).toBe(true);

    if (!created.ok) {
      return;
    }

    // No relationship exists before the receiver responds.
    expect(activeRelationships(database)).toHaveLength(0);

    // A's first letter is stored as a sent letter addressed to B.
    const letter = database
      .select()
      .from(schema.letters)
      .where(eq(schema.letters.id, created.letter.id))
      .get();

    expect(letter).toMatchObject({
      senderId: AUTHOR_ID,
      recipientId: RECEIVER_ID,
      status: 'sent',
      subject: LETTER.subject,
      body: LETTER.body,
    });

    // B receives a penpal request notification pointing at the request.
    const receiverNotifications = notificationsFor(database, RECEIVER_ID);

    expect(receiverNotifications).toHaveLength(1);
    expect(receiverNotifications[0]).toMatchObject({
      type: 'penpal_request',
      referenceType: 'penpal_request',
      referenceId: created.request.id,
      readAt: null,
    });

    // B accepts the request that A created.
    const accepted = acceptPenpalRequest(
      database,
      RECEIVER_ID,
      created.request.id,
    );

    expect(accepted.ok).toBe(true);

    if (!accepted.ok) {
      return;
    }

    const relationships = activeRelationships(database);

    expect(relationships).toHaveLength(1);
    expect(relationships[0]).toMatchObject({
      userLowId: AUTHOR_ID,
      userHighId: RECEIVER_ID,
      status: 'active',
      endedAt: null,
    });
    expect(relationships[0].id).toBe(accepted.relationship.id);

    const request = database
      .select()
      .from(schema.penpalRequests)
      .where(eq(schema.penpalRequests.id, created.request.id))
      .get();

    expect(request).toMatchObject({ status: 'accepted' });
    expect(request?.respondedAt).toBeInstanceOf(Date);

    // A is told that the request was accepted.
    const authorNotifications = notificationsFor(database, AUTHOR_ID);

    expect(authorNotifications).toHaveLength(1);
    expect(authorNotifications[0]).toMatchObject({
      type: 'request_accepted',
      referenceId: created.request.id,
    });
  });

  it('leaves no relationship behind when B rejects the request', () => {
    const created = createFirstContact(database, AUTHOR_ID, LETTER);

    expect(created.ok).toBe(true);

    if (!created.ok) {
      return;
    }

    const rejected = rejectPenpalRequest(
      database,
      RECEIVER_ID,
      created.request.id,
    );

    expect(rejected.ok).toBe(true);

    const request = database
      .select()
      .from(schema.penpalRequests)
      .where(eq(schema.penpalRequests.id, created.request.id))
      .get();

    expect(request).toMatchObject({ status: 'rejected' });
    expect(activeRelationships(database)).toHaveLength(0);
    expect(
      notificationsFor(database, AUTHOR_ID).filter(
        (notification) => notification.type === 'request_accepted',
      ),
    ).toHaveLength(0);
  });

  it('prevents a second first letter from the same pair while pending', () => {
    const created = createFirstContact(database, AUTHOR_ID, LETTER);
    const duplicate = createFirstContact(database, AUTHOR_ID, LETTER);

    expect(created.ok).toBe(true);
    expect(duplicate).toMatchObject({ ok: false, code: 'duplicate_request' });

    expect(
      database
        .select()
        .from(schema.penpalRequests)
        .where(
          and(
            eq(schema.penpalRequests.senderId, AUTHOR_ID),
            eq(schema.penpalRequests.receiverId, RECEIVER_ID),
          ),
        )
        .all(),
    ).toHaveLength(1);
  });
});
