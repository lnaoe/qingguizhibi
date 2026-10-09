import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import type { AppDatabase } from '../../db/client';
import * as schema from '../../db/schema';
import { createLetterDraft } from '../letters/draft-service';
import {
  getLetterDetail,
  markLetterRead,
} from '../letters/detail-service';
import { sendLetter } from '../letters/send-service';
import { createFirstContact } from '../requests/service';
import { acceptPenpalRequest } from '../requests/respond-service';
import { getInboxPage, getSentPage } from './service';

const AUTHOR_ID = 'author';
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

function seedReadyUser(
  database: AppDatabase,
  id: string,
  nickname: string,
): void {
  database
    .insert(schema.users)
    .values({
      id,
      email: `${id}@example.com`,
      status: 'active',
    })
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

function notificationsFor(
  database: AppDatabase,
  userId: string,
  type: string,
) {
  return database
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .all()
    .filter((notification) => notification.type === type);
}

describe('mailbox flow', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedReadyUser(database, AUTHOR_ID, '写信人');
    seedReadyUser(database, RECEIVER_ID, '收信人');
  });

  it('runs first letter -> accept -> reply -> read -> reply again', () => {
    const firstContact = createFirstContact(database, AUTHOR_ID, {
      receiver_id: RECEIVER_ID,
      subject: '第一封信',
      body: '很高兴认识你。',
    });

    expect(firstContact.ok).toBe(true);

    if (!firstContact.ok) {
      return;
    }

    expect(
      notificationsFor(database, RECEIVER_ID, 'penpal_request'),
    ).toHaveLength(1);

    const accepted = acceptPenpalRequest(
      database,
      RECEIVER_ID,
      firstContact.request.id,
    );

    expect(accepted.ok).toBe(true);

    if (!accepted.ok) {
      return;
    }

    const receiverReplyDraft = createLetterDraft(database, RECEIVER_ID, {
      relationship_id: accepted.relationship.id,
      subject: '我收到啦',
      body: '谢谢你写来第一封信，我们继续通信吧。',
    });

    expect(receiverReplyDraft.ok).toBe(true);

    if (!receiverReplyDraft.ok) {
      return;
    }

    const receiverReply = sendLetter(
      database,
      RECEIVER_ID,
      receiverReplyDraft.letter.id,
    );

    expect(receiverReply.ok).toBe(true);

    if (!receiverReply.ok) {
      return;
    }

    const authorInbox = getInboxPage(database, AUTHOR_ID, {
      limit: 20,
      cursor: null,
    });

    expect(authorInbox.items.map((letter) => letter.id)).toContain(
      receiverReply.letter.id,
    );
    expect(
      notificationsFor(database, AUTHOR_ID, 'new_letter'),
    ).toHaveLength(1);

    const replyDetail = getLetterDetail(
      database,
      AUTHOR_ID,
      receiverReply.letter.id,
    );

    expect(replyDetail).toMatchObject({
      ok: true,
      letter: {
        id: receiverReply.letter.id,
        relationshipId: accepted.relationship.id,
        subject: '我收到啦',
        body: '谢谢你写来第一封信，我们继续通信吧。',
        readAt: null,
        replyRelationshipId: accepted.relationship.id,
      },
    });

    const readResult = markLetterRead(
      database,
      AUTHOR_ID,
      receiverReply.letter.id,
    );

    expect(readResult.ok).toBe(true);

    if (!readResult.ok) {
      return;
    }

    expect(readResult.alreadyRead).toBe(false);
    expect(readResult.letter.readAt).toBeInstanceOf(Date);

    const authorReplyDraft = createLetterDraft(database, AUTHOR_ID, {
      relationship_id: accepted.relationship.id,
      subject: '继续写信',
      body: '我也很高兴收到你的回信。',
    });

    expect(authorReplyDraft.ok).toBe(true);

    if (!authorReplyDraft.ok) {
      return;
    }

    const authorReply = sendLetter(
      database,
      AUTHOR_ID,
      authorReplyDraft.letter.id,
    );

    expect(authorReply.ok).toBe(true);

    if (!authorReply.ok) {
      return;
    }

    const receiverInbox = getInboxPage(database, RECEIVER_ID, {
      limit: 20,
      cursor: null,
    });
    const receiverSent = getSentPage(database, RECEIVER_ID, {
      limit: 20,
      cursor: null,
    });
    const authorSent = getSentPage(database, AUTHOR_ID, {
      limit: 20,
      cursor: null,
    });

    expect(receiverInbox.items.map((letter) => letter.id)).toEqual(
      expect.arrayContaining([
        firstContact.letter.id,
        authorReply.letter.id,
      ]),
    );
    expect(receiverSent.items.map((letter) => letter.id)).toContain(
      receiverReply.letter.id,
    );
    expect(authorSent.items.map((letter) => letter.id)).toEqual(
      expect.arrayContaining([
        firstContact.letter.id,
        authorReply.letter.id,
      ]),
    );
    expect(
      notificationsFor(database, RECEIVER_ID, 'new_letter'),
    ).toHaveLength(1);

    const relationship = database
      .select()
      .from(schema.penpalRelationships)
      .where(eq(schema.penpalRelationships.id, accepted.relationship.id))
      .get();

    expect(relationship?.lastLetterAt).toBeInstanceOf(Date);
  });
});
