import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import * as schema from '../../db/schema';
import type { AppDatabase } from '../../db/client';
import { EMPTY_ONBOARDING_VALUES } from '../onboarding/options';
import { saveOnboardingProfile } from '../onboarding/service';
import type { ProfileValues } from './types';
import { getProfileSnapshot, saveProfile } from './service';

const USER_ID = 'profile-user';
const USER_EMAIL = 'profile@example.com';

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

function createInitialValues(): ProfileValues {
  return {
    ...EMPTY_ONBOARDING_VALUES,
    nickname: '纸笔',
    country: '中国',
    city: '杭州',
    ageRange: '25-29',
    languages: ['中文（简体）'],
    interestIds: ['reading', 'writing', 'music'],
    bio: '喜欢阅读、散步和慢慢写信。',
    penpalReasons: ['分享日常生活', '找到长期笔友'],
    visibility: 'public',
  };
}

function seedCompletedProfile(database: AppDatabase, values: ProfileValues) {
  const onboardingResult = saveOnboardingProfile(
    database,
    USER_ID,
    USER_EMAIL,
    values,
  );

  expect(onboardingResult).toEqual({ ok: true });
}

function sortInterestIds(values: ProfileValues): ProfileValues {
  return {
    ...values,
    interestIds: [...values.interestIds].sort(),
  };
}

describe('profile service', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  it('reloads the same values after saving profile and interests', () => {
    seedCompletedProfile(database, createInitialValues());

    const updatedValues: ProfileValues = {
      ...createInitialValues(),
      nickname: '青笺',
      avatarUrl: 'https://example.com/avatar.png',
      country: '日本',
      city: '京都',
      ageRange: '30-34',
      languages: ['English', '日本語'],
      interestIds: ['travel', 'food', 'music'],
      bio: '想通过信件认识不同地方的人。',
      penpalReasons: ['交换想法与观点', '享受等待与回信'],
      visibility: 'hidden',
    };

    expect(saveProfile(database, USER_ID, updatedValues)).toEqual({ ok: true });

    const snapshot = getProfileSnapshot(database, USER_ID);

    expect(snapshot).not.toBeNull();
    expect(snapshot && sortInterestIds(snapshot.values)).toEqual(
      sortInterestIds(updatedValues),
    );
    expect(snapshot?.interests.map((interest) => interest.id).sort()).toEqual([
      'food',
      'music',
      'travel',
    ]);

    const profile = database
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, USER_ID))
      .get();

    expect(profile?.onboardingCompleted).toBe(true);
    expect(profile?.visibility).toBe('hidden');
  });

  it('replaces interests without creating duplicate selections', () => {
    seedCompletedProfile(database, createInitialValues());

    saveProfile(database, USER_ID, {
      ...createInitialValues(),
      interestIds: ['reading', 'travel', 'food', 'music'],
    });
    saveProfile(database, USER_ID, {
      ...createInitialValues(),
      interestIds: ['travel', 'food', 'music'],
    });

    const selectedInterests = database
      .select()
      .from(schema.userInterests)
      .where(eq(schema.userInterests.userId, USER_ID))
      .all();

    expect(selectedInterests.map((row) => row.interestId).sort()).toEqual([
      'food',
      'music',
      'travel',
    ]);
  });

  it('does not change stored values when validation fails', () => {
    const initialValues = createInitialValues();
    seedCompletedProfile(database, initialValues);

    const result = saveProfile(database, USER_ID, {
      ...initialValues,
      nickname: '不应保存',
      interestIds: ['reading', 'writing'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors?.interestIds).toBe('请至少选择 3 个兴趣');
    }

    const snapshot = getProfileSnapshot(database, USER_ID);
    expect(snapshot && sortInterestIds(snapshot.values)).toEqual(
      sortInterestIds(initialValues),
    );
  });

  it('returns no profile before onboarding is complete', () => {
    expect(getProfileSnapshot(database, USER_ID)).toBeNull();
  });
});
