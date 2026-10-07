import { describe, it, expect, beforeAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '../client';
import * as schema from '../schema';

describe('Database constraints', () => {
  beforeAll(() => {
    // Create tables in memory for testing
    try {
      db.$client.exec(`
        DROP TABLE IF EXISTS reports;
        DROP TABLE IF EXISTS blocks;
        DROP TABLE IF EXISTS notifications;
        DROP TABLE IF EXISTS letters;
        DROP TABLE IF EXISTS penpal_relationships;
        DROP TABLE IF EXISTS penpal_requests;
        DROP TABLE IF EXISTS user_interests;
        DROP TABLE IF EXISTS interests;
        DROP TABLE IF EXISTS profiles;
        DROP TABLE IF EXISTS users;

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

        CREATE INDEX profiles_visibility_onboarding_idx ON profiles(visibility, onboarding_completed);

        CREATE TABLE interests (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          category TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE user_interests (
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          interest_id TEXT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(user_id, interest_id)
        );

        CREATE INDEX user_interests_user_id_interest_id_idx ON user_interests(user_id, interest_id);

        CREATE TABLE penpal_requests (
          id TEXT PRIMARY KEY,
          sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          initial_letter_id TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          responded_at TIMESTAMP
        );

        CREATE INDEX penpal_requests_sender_id_receiver_id_status_idx ON penpal_requests(sender_id, receiver_id, status);
        CREATE INDEX penpal_requests_receiver_id_status_idx ON penpal_requests(receiver_id, status);
        CREATE UNIQUE INDEX penpal_requests_pending_unique_idx ON penpal_requests(sender_id, receiver_id) WHERE status = 'pending';

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

        CREATE INDEX penpal_relationships_user_low_high_idx ON penpal_relationships(user_low_id, user_high_id);
        CREATE UNIQUE INDEX penpal_relationships_active_unique_idx ON penpal_relationships(user_low_id, user_high_id) WHERE status = 'active';

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

        CREATE INDEX letters_relationship_id_created_at_idx ON letters(relationship_id, created_at);
        CREATE INDEX letters_recipient_id_status_created_at_idx ON letters(recipient_id, status, created_at);

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

        CREATE INDEX notifications_user_id_read_at_created_at_idx ON notifications(user_id, read_at, created_at);

        CREATE TABLE blocks (
          id TEXT PRIMARY KEY,
          blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(blocker_id, blocked_id)
        );

        CREATE INDEX blocks_blocker_id_blocked_id_idx ON blocks(blocker_id, blocked_id);

        CREATE TABLE reports (
          id TEXT PRIMARY KEY,
          reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reported_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          letter_id TEXT REFERENCES letters(id) ON DELETE SET NULL,
          reason TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP
        );

        CREATE INDEX reports_status_created_at_idx ON reports(status, created_at);
      `);
    } catch (e) {
      console.error(e);
    }
  });

  it('should prevent duplicate emails for users', () => {
    // Insert first user
    db.insert(schema.users).values([
      { id: 'test-user-1', email: 'duplicate@example.com' },
    ]).run();

    // Attempt to insert second user with same email
    expect(() => {
      db.insert(schema.users).values([
        { id: 'test-user-2', email: 'duplicate@example.com' },
      ]).run();
    }).toThrow();
  });

  it('should prevent duplicate pending requests from same sender to same receiver', () => {
    // Insert two test users if not exists
    try {
      db.insert(schema.users).values([
        { id: 'test-user-a', email: 'a@example.com' },
        { id: 'test-user-b', email: 'b@example.com' },
      ]).run();
    } catch {
      // ignore if already inserted
    }

    // Insert first pending request
    db.insert(schema.penpalRequests).values({
      id: 'req-1',
      senderId: 'test-user-a',
      receiverId: 'test-user-b',
      status: 'pending',
    }).run();

    // Attempt to insert second pending request
    expect(() => {
      db.insert(schema.penpalRequests).values({
        id: 'req-2',
        senderId: 'test-user-a',
        receiverId: 'test-user-b',
        status: 'pending',
      }).run();
    }).toThrow();
  });

  it('should prevent duplicate active relationships for the same pair', () => {
    // Insert relationship
    db.insert(schema.penpalRelationships).values({
      id: 'rel-1',
      userLowId: 'test-user-a',
      userHighId: 'test-user-b',
      status: 'active',
    }).run();

    // Attempt to insert second active relationship
    expect(() => {
      db.insert(schema.penpalRelationships).values({
        id: 'rel-2',
        userLowId: 'test-user-a',
        userHighId: 'test-user-b',
        status: 'active',
      }).run();
    }).toThrow();
  });

  it('should prevent duplicate block pairs', () => {
    // Insert block
    db.insert(schema.blocks).values({
      id: 'block-1',
      blockerId: 'test-user-a',
      blockedId: 'test-user-b',
    }).run();

    // Attempt to insert duplicate block
    expect(() => {
      db.insert(schema.blocks).values({
        id: 'block-2',
        blockerId: 'test-user-a',
        blockedId: 'test-user-b',
      }).run();
    }).toThrow();
  });

  it('should allow multiple requests after previous is accepted', () => {
    // This should work because previous is no longer pending
    db.update(schema.penpalRequests)
      .set({ status: 'accepted', respondedAt: new Date() })
      .where(sql`id = 'req-1'`)
      .run();

    // Insert another request (should work)
    expect(() => {
      db.insert(schema.penpalRequests).values({
        id: 'req-3',
        senderId: 'test-user-a',
        receiverId: 'test-user-b',
        status: 'pending',
      }).run();
    }).not.toThrow();
  });
});
