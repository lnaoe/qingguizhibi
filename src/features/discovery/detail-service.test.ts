import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import * as schema from '../../db/schema';
import type { AppDatabase } from '../../db/client';
import { INTEREST_OPTIONS } from '../onboarding/options';
import { getPublicPenpalProfile } from './service';

type UserStatus = (typeof schema.userStatusValues)[number];
type ProfileVisibility = (typeof schema.profileVisibilityValues)[number];

interface SeedUserOptions {
  nickname?: string;
  status?: UserStatus;
  visibility?: ProfileVisibility;
  onboardingCompleted?: boolean;
  bio?: string;
  penpalReason?: string;
  interestIds?: string[];
}

const VIEWER_ID = 'current-user';

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
  `);

  return drizzle(sqlite, { schema: { ...schema, ...authSchema } });
}

function seedInterests(database: AppDatabase): void {
  database
    .insert(schema.interests)
    .values(
      INTEREST_OPTIONS.map((interest) => ({
        id: interest.id,
        name: interest.name,
        slug: interest.slug,
        category: interest.category,
      })),
    )
    .run();
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
      country: '中国',
      city: '杭州',
      ageRange: '25-29',
      languages: ['中文（简体）'],
      bio: options.bio,
      penpalReason: options.penpalReason ?? null,
      visibility: options.visibility ?? 'public',
      onboardingCompleted: options.onboardingCompleted ?? true,
    })
    .run();

  if (options.interestIds && options.interestIds.length > 0) {
    database
      .insert(schema.userInterests)
      .values(
        options.interestIds.map((interestId) => ({
          userId: id,
          interestId,
        })),
      )
      .run();
  }
}

describe('public penpal profile service', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedInterests(database);
    seedUser(database, VIEWER_ID, { nickname: 'viewer' });
  });

  it('returns only the public fields needed for the detail page', () => {
    seedUser(database, 'penpal-a', {
      nickname: '青禾',
      bio: '住在杭州，喜欢在雨天写信。',
      penpalReason: '分享日常生活、交换想法与观点',
      interestIds: ['reading', 'writing'],
    });

    const profile = getPublicPenpalProfile(
      database,
      'penpal-a',
      VIEWER_ID,
    );

    expect(profile).toEqual({
      id: 'penpal-a',
      nickname: '青禾',
      avatarUrl: null,
      country: '中国',
      city: '杭州',
      ageRange: '25-29',
      languages: ['中文（简体）'],
      bio: '住在杭州，喜欢在雨天写信。',
      penpalReasons: ['分享日常生活', '交换想法与观点'],
      interests: [
        expect.objectContaining({ id: 'reading', name: '阅读' }),
        expect.objectContaining({ id: 'writing', name: '写作' }),
      ],
    });
    expect(profile).not.toHaveProperty('email');
    expect(profile).not.toHaveProperty('status');
    expect(profile).not.toHaveProperty('visibility');
    expect(profile).not.toHaveProperty('onboardingCompleted');
    expect(profile).not.toHaveProperty('createdAt');
    expect(profile).not.toHaveProperty('updatedAt');
  });

  it('hides a hidden profile from other users but allows the owner', () => {
    seedUser(database, 'hidden-penpal', { visibility: 'hidden' });

    expect(
      getPublicPenpalProfile(database, 'hidden-penpal', VIEWER_ID),
    ).toBeNull();
    expect(
      getPublicPenpalProfile(database, 'hidden-penpal', 'hidden-penpal'),
    ).not.toBeNull();
  });

  it('does not expose profiles that are inactive or not onboarded', () => {
    seedUser(database, 'suspended-penpal', { status: 'suspended' });
    seedUser(database, 'deleted-penpal', { status: 'deleted' });
    seedUser(database, 'incomplete-penpal', {
      onboardingCompleted: false,
    });

    expect(
      getPublicPenpalProfile(database, 'suspended-penpal', VIEWER_ID),
    ).toBeNull();
    expect(
      getPublicPenpalProfile(database, 'deleted-penpal', VIEWER_ID),
    ).toBeNull();
    expect(
      getPublicPenpalProfile(database, 'incomplete-penpal', VIEWER_ID),
    ).toBeNull();
  });

  it('returns null for a user that does not exist', () => {
    expect(
      getPublicPenpalProfile(database, 'missing-user', VIEWER_ID),
    ).toBeNull();
  });
});
