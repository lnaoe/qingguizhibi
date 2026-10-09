import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import type { AppDatabase } from '../../db/client';
import * as schema from '../../db/schema';
import {
  createLetterDraft,
  getDraftForEditing,
  updateLetterDraft,
} from './draft-service';

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

function seedUser(database: AppDatabase, id: string): void {
  database
    .insert(schema.users)
    .values({
      id,
      email: `${id}@example.com`,
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
  },
): void {
  database.insert(schema.penpalRelationships).values(values).run();
}

describe('letter draft service', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedUser(database, 'user-a');
    seedUser(database, 'user-b');
    seedUser(database, 'user-c');
  });

  it('creates a draft for an active relationship participant', () => {
    seedRelationship(database, {
      id: 'relationship-1',
      userLowId: 'user-a',
      userHighId: 'user-b',
      status: 'active',
    });

    const result = createLetterDraft(database, 'user-a', {
      relationship_id: ' relationship-1 ',
      subject: ' 你好 ',
      body: '',
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.letter).toMatchObject({
      relationshipId: 'relationship-1',
      senderId: 'user-a',
      recipientId: 'user-b',
      subject: '你好',
      body: '',
      status: 'draft',
      sentAt: null,
      readAt: null,
    });
    expect(result.letter.createdAt).toBeInstanceOf(Date);
    expect(result.letter.updatedAt).toBeInstanceOf(Date);

    const stored = database.select().from(schema.letters).get();

    expect(stored).toMatchObject({
      id: result.letter.id,
      relationshipId: 'relationship-1',
      status: 'draft',
    });
  });

  it('rejects an inactive or unrelated relationship', () => {
    seedRelationship(database, {
      id: 'ended-relationship',
      userLowId: 'user-a',
      userHighId: 'user-b',
      status: 'ended',
    });
    seedRelationship(database, {
      id: 'other-relationship',
      userLowId: 'user-b',
      userHighId: 'user-c',
      status: 'active',
    });

    const endedResult = createLetterDraft(database, 'user-a', {
      relationship_id: 'ended-relationship',
      subject: '',
      body: '',
    });
    const unrelatedResult = createLetterDraft(database, 'user-a', {
      relationship_id: 'other-relationship',
      subject: '',
      body: '',
    });

    expect(endedResult).toEqual({
      ok: false,
      code: 'relationship_not_found',
      message: '找不到可以写信的笔友',
    });
    expect(unrelatedResult).toEqual({
      ok: false,
      code: 'relationship_not_found',
      message: '找不到可以写信的笔友',
    });
    expect(database.select().from(schema.letters).all()).toHaveLength(0);
  });

  it('updates only the current users draft and preserves omitted fields', () => {
    seedRelationship(database, {
      id: 'relationship-1',
      userLowId: 'user-a',
      userHighId: 'user-b',
      status: 'active',
    });

    const createdAt = new Date('2026-01-01T08:00:00.000Z');

    database
      .insert(schema.letters)
      .values({
        id: 'draft-1',
        relationshipId: 'relationship-1',
        senderId: 'user-a',
        recipientId: 'user-b',
        subject: '旧主题',
        body: '保留的正文',
        status: 'draft',
        sentAt: null,
        readAt: null,
        createdAt,
        updatedAt: createdAt,
      })
      .run();

    const result = updateLetterDraft(database, 'user-a', 'draft-1', {
      subject: '新主题',
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.letter).toMatchObject({
      id: 'draft-1',
      relationshipId: 'relationship-1',
      subject: '新主题',
      body: '保留的正文',
      status: 'draft',
      createdAt,
    });
    expect(result.letter.updatedAt.getTime()).toBeGreaterThanOrEqual(
      createdAt.getTime(),
    );

    const stored = database.select().from(schema.letters).get();

    expect(stored).toMatchObject({
      subject: '新主题',
      body: '保留的正文',
    });
  });

  it('does not let another user update a draft', () => {
    seedRelationship(database, {
      id: 'relationship-1',
      userLowId: 'user-a',
      userHighId: 'user-b',
      status: 'active',
    });

    database
      .insert(schema.letters)
      .values({
        id: 'draft-1',
        relationshipId: 'relationship-1',
        senderId: 'user-b',
        recipientId: 'user-a',
        subject: '别人的草稿',
        body: '正文',
        status: 'draft',
        sentAt: null,
        readAt: null,
      })
      .run();

    const result = updateLetterDraft(database, 'user-a', 'draft-1', {
      subject: '不应保存',
    });

    expect(result).toEqual({
      ok: false,
      code: 'draft_not_found',
      message: '找不到这封草稿',
    });
  });

  it('loads a saved draft for its sender and saves recovered edits', () => {
    seedRelationship(database, {
      id: 'relationship-1',
      userLowId: 'user-a',
      userHighId: 'user-b',
      status: 'active',
    });
    database
      .insert(schema.profiles)
      .values({
        userId: 'user-b',
        nickname: '远山',
      })
      .run();

    const createdAt = new Date('2026-01-01T08:00:00.000Z');

    database
      .insert(schema.letters)
      .values({
        id: 'draft-1',
        relationshipId: 'relationship-1',
        senderId: 'user-a',
        recipientId: 'user-b',
        subject: '旧主题',
        body: '旧正文',
        status: 'draft',
        sentAt: null,
        readAt: null,
        createdAt,
        updatedAt: createdAt,
      })
      .run();

    const loaded = getDraftForEditing(database, 'user-a', 'draft-1');

    expect(loaded).toEqual({
      ok: true,
      draft: {
        id: 'draft-1',
        relationshipId: 'relationship-1',
        recipient: {
          id: 'user-b',
          nickname: '远山',
          avatarUrl: null,
        },
        subject: '旧主题',
        body: '旧正文',
        updatedAt: createdAt,
      },
    });

    if (!loaded.ok) {
      return;
    }

    const updated = updateLetterDraft(database, 'user-a', loaded.draft.id, {
      subject: '新主题',
      body: '新正文',
    });

    expect(updated.ok).toBe(true);
    expect(getDraftForEditing(database, 'user-a', 'draft-1')).toMatchObject({
      ok: true,
      draft: {
        subject: '新主题',
        body: '新正文',
      },
    });

    const stored = database.select().from(schema.letters).get();

    expect(stored).toMatchObject({
      status: 'draft',
      sentAt: null,
      readAt: null,
    });
  });

  it('rejects draft recovery for non-senders and sent letters', () => {
    seedRelationship(database, {
      id: 'relationship-1',
      userLowId: 'user-a',
      userHighId: 'user-b',
      status: 'active',
    });
    database
      .insert(schema.letters)
      .values({
        id: 'draft-1',
        relationshipId: 'relationship-1',
        senderId: 'user-a',
        recipientId: 'user-b',
        subject: '私密草稿',
        body: '正文',
        status: 'draft',
        sentAt: null,
        readAt: null,
      })
      .run();

    expect(getDraftForEditing(database, 'user-b', 'draft-1')).toEqual({
      ok: false,
      code: 'draft_not_found',
      message: '找不到这封草稿',
    });

    database
      .update(schema.letters)
      .set({
        status: 'sent',
        sentAt: new Date('2026-01-02T08:00:00.000Z'),
      })
      .run();

    expect(getDraftForEditing(database, 'user-a', 'draft-1')).toEqual({
      ok: false,
      code: 'draft_not_found',
      message: '找不到这封草稿',
    });
  });
});
