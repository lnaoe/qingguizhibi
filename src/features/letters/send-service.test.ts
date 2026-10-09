import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import type { AppDatabase } from '../../db/client';
import * as schema from '../../db/schema';
import { getInboxPage, getSentPage } from '../mailbox/service';
import {
  getDraftForEditing,
  updateLetterDraft,
} from './draft-service';
import { sendLetter } from './send-service';

function createTestDatabase(): {
  database: AppDatabase;
  sqlite: InstanceType<typeof Database>;
} {
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
      blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (blocker_id, blocked_id)
    );
  `);

  return {
    database: drizzle(sqlite, { schema: { ...schema, ...authSchema } }),
    sqlite,
  };
}

function seedUser(
  database: AppDatabase,
  id: string,
  nickname: string,
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
      onboardingCompleted: true,
    })
    .run();
}

function seedRelationship(
  database: AppDatabase,
  status: 'active' | 'ended' = 'active',
): void {
  database
    .insert(schema.penpalRelationships)
    .values({
      id: 'relationship-1',
      userLowId: 'user-a',
      userHighId: 'user-b',
      status,
      endedAt: status === 'ended' ? new Date() : null,
    })
    .run();
}

function seedDraft(
  database: AppDatabase,
  overrides: Partial<typeof schema.letters.$inferInsert> = {},
): void {
  database
    .insert(schema.letters)
    .values({
      id: 'draft-1',
      relationshipId: 'relationship-1',
      senderId: 'user-a',
      recipientId: 'user-b',
      subject: '回信',
      body: '  最近好吗？\n这里一切都好。  ',
      status: 'draft',
      sentAt: null,
      readAt: null,
      ...overrides,
    })
    .run();
}

describe('letter send service', () => {
  let database: AppDatabase;
  let sqlite: InstanceType<typeof Database>;

  beforeEach(() => {
    const testDatabase = createTestDatabase();

    database = testDatabase.database;
    sqlite = testDatabase.sqlite;
    seedUser(database, 'user-a', '青笺');
    seedUser(database, 'user-b', '远山');
    seedUser(database, 'user-c', '路人');
    seedRelationship(database);
  });

  it('sends a draft, updates the relationship, notifies the recipient, and exposes it to both mailboxes', () => {
    seedDraft(database);

    const result = sendLetter(database, 'user-a', 'draft-1');

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.alreadySent).toBe(false);
    expect(result.letter).toMatchObject({
      id: 'draft-1',
      relationshipId: 'relationship-1',
      senderId: 'user-a',
      recipientId: 'user-b',
      subject: '回信',
      body: '最近好吗？\n这里一切都好。',
      status: 'sent',
      readAt: null,
    });
    expect(result.letter.sentAt).toBeInstanceOf(Date);

    const storedLetter = database
      .select()
      .from(schema.letters)
      .where(eq(schema.letters.id, 'draft-1'))
      .get();
    const storedRelationship = database
      .select()
      .from(schema.penpalRelationships)
      .get();
    const notifications = database
      .select()
      .from(schema.notifications)
      .all();

    expect(storedLetter).toMatchObject({
      status: 'sent',
      body: '最近好吗？\n这里一切都好。',
      sentAt: result.letter.sentAt,
    });
    expect(storedRelationship?.lastLetterAt).toEqual(result.letter.sentAt);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      userId: 'user-b',
      type: 'new_letter',
      title: '青笺 给你寄来了一封信',
      body: '回信',
      referenceType: 'letter',
      referenceId: 'draft-1',
      readAt: null,
    });

    const sentPage = getSentPage(database, 'user-a', {
      limit: 20,
      cursor: null,
    });
    const inboxPage = getInboxPage(database, 'user-b', {
      limit: 20,
      cursor: null,
    });

    expect(sentPage.items.map((letter) => letter.id)).toEqual(['draft-1']);
    expect(inboxPage.items.map((letter) => letter.id)).toEqual(['draft-1']);
  });

  it('returns the existing sent letter on a repeated send without writing again', () => {
    seedDraft(database);

    const firstResult = sendLetter(database, 'user-a', 'draft-1');

    expect(firstResult.ok).toBe(true);

    if (!firstResult.ok) {
      return;
    }

    const relationshipAfterFirstSend = database
      .select()
      .from(schema.penpalRelationships)
      .get();
    const repeatedResult = sendLetter(database, 'user-a', 'draft-1');

    expect(repeatedResult).toEqual({
      ok: true,
      letter: firstResult.letter,
      alreadySent: true,
    });
    expect(database.select().from(schema.letters).all()).toHaveLength(1);
    expect(database.select().from(schema.notifications).all()).toHaveLength(1);
    expect(
      database.select().from(schema.penpalRelationships).get()
        ?.lastLetterAt,
    ).toEqual(relationshipAfterFirstSend?.lastLetterAt);
  });

  it('loads and updates a saved draft without side effects until it is sent', () => {
    seedDraft(database);

    const loaded = getDraftForEditing(database, 'user-a', 'draft-1');

    expect(loaded).toMatchObject({
      ok: true,
      draft: {
        id: 'draft-1',
        relationshipId: 'relationship-1',
        recipient: {
          id: 'user-b',
          nickname: '远山',
          avatarUrl: null,
        },
        subject: '回信',
        body: '  最近好吗？\n这里一切都好。  ',
      },
    });

    if (!loaded.ok) {
      return;
    }

    const updated = updateLetterDraft(database, 'user-a', loaded.draft.id, {
      subject: '重新写好的回信',
      body: '最近好吗？\n我最近开始学着慢慢写信。',
    });

    expect(updated.ok).toBe(true);
    expect(database.select().from(schema.letters).get()).toMatchObject({
      status: 'draft',
      sentAt: null,
      readAt: null,
    });
    expect(database.select().from(schema.notifications).all()).toHaveLength(0);
    expect(
      database.select().from(schema.penpalRelationships).get()
        ?.lastLetterAt,
    ).toBeNull();

    const sent = sendLetter(database, 'user-a', loaded.draft.id);

    expect(sent).toMatchObject({
      ok: true,
      alreadySent: false,
      letter: {
        id: 'draft-1',
        status: 'sent',
        subject: '重新写好的回信',
        body: '最近好吗？\n我最近开始学着慢慢写信。',
      },
    });
    expect(database.select().from(schema.notifications).all()).toHaveLength(1);
  });

  it('rejects a missing letter and a non-sender without changing the draft', () => {
    seedDraft(database);

    expect(sendLetter(database, 'user-a', 'missing-letter')).toEqual({
      ok: false,
      code: 'letter_not_found',
      message: '找不到这封草稿',
    });
    expect(sendLetter(database, 'user-b', 'draft-1')).toEqual({
      ok: false,
      code: 'forbidden',
      message: '只有寄信人可以寄出这封草稿',
    });
    expect(database.select().from(schema.letters).get()).toMatchObject({
      status: 'draft',
      sentAt: null,
    });
    expect(database.select().from(schema.notifications).all()).toHaveLength(0);
  });

  it('rejects a draft after the relationship ends', () => {
    database
      .update(schema.penpalRelationships)
      .set({
        status: 'ended',
        endedAt: new Date('2026-01-04T08:00:00.000Z'),
      })
      .run();
    seedDraft(database);

    expect(sendLetter(database, 'user-a', 'draft-1')).toEqual({
      ok: false,
      code: 'relationship_not_active',
      message: '这段笔友关系已结束，不能寄信',
    });
    expect(database.select().from(schema.letters).get()).toMatchObject({
      status: 'draft',
      sentAt: null,
    });
    expect(database.select().from(schema.notifications).all()).toHaveLength(0);
  });

  it.each([
    ['user-a', 'user-b'],
    ['user-b', 'user-a'],
  ])(
    'rejects sending when %s has blocked %s',
    (blockerId, blockedId) => {
      database
        .insert(schema.blocks)
        .values({
          id: 'block-1',
          blockerId,
          blockedId,
        })
        .run();
      seedDraft(database);

      expect(sendLetter(database, 'user-a', 'draft-1')).toEqual({
        ok: false,
        code: 'blocked',
        message: '暂时无法给这位笔友寄信',
      });
      expect(database.select().from(schema.letters).get()).toMatchObject({
        status: 'draft',
        sentAt: null,
      });
      expect(database.select().from(schema.notifications).all()).toHaveLength(0);
    },
  );

  it('rejects a draft with an empty body', () => {
    seedDraft(database, {
      body: ' \n ',
    });

    expect(sendLetter(database, 'user-a', 'draft-1')).toEqual({
      ok: false,
      code: 'validation_error',
      message: '请求参数无效',
      errors: {
        body: '请写下想对这位笔友说的话',
      },
    });
    expect(database.select().from(schema.letters).get()).toMatchObject({
      status: 'draft',
      sentAt: null,
    });
    expect(
      database.select().from(schema.penpalRelationships).get()
        ?.lastLetterAt,
    ).toBeNull();
  });

  it('rolls back the letter and relationship when notification creation fails', () => {
    seedDraft(database);
    sqlite.exec(`
      CREATE TRIGGER fail_new_letter_notification
      BEFORE INSERT ON notifications
      BEGIN
        SELECT RAISE(ABORT, 'notification failed');
      END;
    `);

    expect(() => sendLetter(database, 'user-a', 'draft-1')).toThrow(
      'notification failed',
    );
    expect(database.select().from(schema.letters).get()).toMatchObject({
      status: 'draft',
      sentAt: null,
    });
    expect(
      database.select().from(schema.penpalRelationships).get()
        ?.lastLetterAt,
    ).toBeNull();
  });
});
