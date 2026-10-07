import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import * as schema from '../../db/schema';
import type { AppDatabase } from '../../db/client';
import { EMPTY_ONBOARDING_VALUES } from './options';
import {
  getOnboardingSnapshot,
  saveOnboardingProfile,
} from './service';
import type { OnboardingValues } from './types';

const USER_ID = 'onboarding-user';
const USER_EMAIL = 'onboarding@example.com';

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

function createValidValues(): OnboardingValues {
  return {
    ...EMPTY_ONBOARDING_VALUES,
    nickname: '纸笔',
    country: '中国',
    city: '杭州',
    ageRange: '25-29',
    languages: ['中文（简体）', 'English'],
    interestIds: ['reading', 'writing', 'music'],
    bio: '喜欢阅读、散步和慢慢写信。',
    penpalReasons: ['分享日常生活', '找到长期笔友'],
  };
}

describe('onboarding service', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  it('creates the business user, profile and interests in one transaction', () => {
    const result = saveOnboardingProfile(
      database,
      USER_ID,
      USER_EMAIL,
      createValidValues(),
    );

    expect(result).toEqual({ ok: true });

    const businessUser = database
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, USER_ID))
      .get();
    expect(businessUser?.email).toBe(USER_EMAIL);

    const profile = database
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, USER_ID))
      .get();
    expect(profile).toMatchObject({
      nickname: '纸笔',
      country: '中国',
      city: '杭州',
      ageRange: '25-29',
      bio: '喜欢阅读、散步和慢慢写信。',
      penpalReason: '分享日常生活、找到长期笔友',
      languages: ['中文（简体）', 'English'],
      onboardingCompleted: true,
    });

    const selectedInterests = database
      .select()
      .from(schema.userInterests)
      .where(eq(schema.userInterests.userId, USER_ID))
      .all();
    expect(selectedInterests.map((row) => row.interestId).sort()).toEqual([
      'music',
      'reading',
      'writing',
    ]);

    const catalog = database.select().from(schema.interests).all();
    expect(catalog.length).toBeGreaterThanOrEqual(18);
  });

  it('does not write an incomplete profile', () => {
    const result = saveOnboardingProfile(
      database,
      USER_ID,
      USER_EMAIL,
      EMPTY_ONBOARDING_VALUES,
    );

    expect(result.ok).toBe(false);
    expect(database.select().from(schema.users).all()).toHaveLength(0);
    expect(database.select().from(schema.profiles).all()).toHaveLength(0);
  });

  it('reloads the saved profile for a later onboarding visit', () => {
    saveOnboardingProfile(
      database,
      USER_ID,
      USER_EMAIL,
      createValidValues(),
    );

    const snapshot = getOnboardingSnapshot(database, USER_ID);

    expect(snapshot.onboardingCompleted).toBe(true);
    expect({
      ...snapshot.values,
      interestIds: [...snapshot.values.interestIds].sort(),
    }).toMatchObject({
      nickname: '纸笔',
      interestIds: ['music', 'reading', 'writing'],
      penpalReasons: ['分享日常生活', '找到长期笔友'],
    });
  });
});
