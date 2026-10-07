import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema } from '../../db/auth-schema';
import * as schema from '../../db/schema';
import type { AppDatabase } from '../../db/client';
import { INTEREST_OPTIONS } from '../onboarding/options';
import { parseDiscoveryQuery } from './query';
import { discoverPenpals } from './service';
import type { DiscoveryCriteria, DiscoveryPenpal } from './types';

type UserStatus = (typeof schema.userStatusValues)[number];
type ProfileVisibility = (typeof schema.profileVisibilityValues)[number];

interface SeedUserOptions {
  status?: UserStatus;
  visibility?: ProfileVisibility;
  onboardingCompleted?: boolean;
  ageRange?: string;
  country?: string;
  city?: string;
  languages?: string[];
  interestIds?: string[];
}

const CURRENT_USER_ID = 'current-user';

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
      nickname: id,
      country: options.country ?? '中国',
      city: options.city ?? '杭州',
      ageRange: options.ageRange ?? '25-29',
      languages: options.languages ?? ['中文（简体）'],
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

function createCriteria(
  overrides: Partial<DiscoveryCriteria> = {},
): DiscoveryCriteria {
  return {
    limit: 20,
    cursor: null,
    ageRange: null,
    language: null,
    country: null,
    city: null,
    interestIds: [],
    recommend: false,
    ...overrides,
  };
}

function ids(items: DiscoveryPenpal[]): string[] {
  return items.map((item) => item.id);
}

function readNextCriteria(
  criteria: DiscoveryCriteria,
  nextCursor: string,
): DiscoveryCriteria {
  const parsed = parseDiscoveryQuery(
    new URLSearchParams({
      cursor: nextCursor,
      limit: String(criteria.limit),
      recommend: String(criteria.recommend),
    }),
  );

  if (!parsed.ok) {
    throw new Error('Expected a valid discovery cursor.');
  }

  return parsed.criteria;
}

function collectPages(
  database: AppDatabase,
  criteria: DiscoveryCriteria,
): DiscoveryPenpal[][] {
  const pages: DiscoveryPenpal[][] = [];
  let currentCriteria = criteria;

  for (let pageNumber = 0; pageNumber < 10; pageNumber += 1) {
    const page = discoverPenpals(
      database,
      CURRENT_USER_ID,
      currentCriteria,
    );
    pages.push(page.items);

    if (!page.hasMore || !page.nextCursor) {
      return pages;
    }

    currentCriteria = readNextCriteria(
      currentCriteria,
      page.nextCursor,
    );
  }

  throw new Error('Discovery pagination did not finish.');
}

function canonicalPair(firstUserId: string, secondUserId: string) {
  return firstUserId < secondUserId
    ? { userLowId: firstUserId, userHighId: secondUserId }
    : { userLowId: secondUserId, userHighId: firstUserId };
}

describe('discovery service', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    seedInterests(database);
    seedUser(database, CURRENT_USER_ID, {
      interestIds: ['reading', 'writing'],
    });
  });

  it('excludes the current user, hidden and inactive profiles, blocks and existing relationships', () => {
    seedUser(database, 'visible-candidate');
    seedUser(database, 'hidden-candidate', { visibility: 'hidden' });
    seedUser(database, 'suspended-candidate', { status: 'suspended' });
    seedUser(database, 'deleted-candidate', { status: 'deleted' });
    seedUser(database, 'incomplete-candidate', {
      onboardingCompleted: false,
    });
    seedUser(database, 'blocked-by-current');
    seedUser(database, 'blocked-current');
    seedUser(database, 'active-relationship');
    seedUser(database, 'ended-relationship');

    database
      .insert(schema.blocks)
      .values([
        {
          id: 'block-1',
          blockerId: CURRENT_USER_ID,
          blockedId: 'blocked-by-current',
        },
        {
          id: 'block-2',
          blockerId: 'blocked-current',
          blockedId: CURRENT_USER_ID,
        },
      ])
      .run();

    database
      .insert(schema.penpalRelationships)
      .values([
        {
          id: 'relationship-1',
          ...canonicalPair(CURRENT_USER_ID, 'active-relationship'),
          status: 'active',
        },
        {
          id: 'relationship-2',
          ...canonicalPair(CURRENT_USER_ID, 'ended-relationship'),
          status: 'ended',
          endedAt: new Date(),
        },
      ])
      .run();

    const page = discoverPenpals(
      database,
      CURRENT_USER_ID,
      createCriteria(),
    );

    expect(ids(page.items)).toEqual(['visible-candidate']);
  });

  it('applies age, language, country, city and interest filters', () => {
    seedUser(database, 'alice', {
      ageRange: '25-29',
      country: '中国',
      city: '杭州',
      languages: ['中文（简体）', 'English'],
      interestIds: ['reading', 'writing'],
    });
    seedUser(database, 'bob', {
      ageRange: '30-34',
      country: '日本',
      city: '京都',
      languages: ['日本語'],
      interestIds: ['writing'],
    });
    seedUser(database, 'carol', {
      ageRange: '25-29',
      country: '中国',
      city: '杭州',
      languages: ['English'],
      interestIds: ['music'],
    });

    expect(
      ids(
        discoverPenpals(
          database,
          CURRENT_USER_ID,
          createCriteria({ ageRange: '25-29' }),
        ).items,
      ),
    ).toEqual(['alice', 'carol']);
    expect(
      ids(
        discoverPenpals(
          database,
          CURRENT_USER_ID,
          createCriteria({ language: 'English' }),
        ).items,
      ),
    ).toEqual(['alice', 'carol']);
    expect(
      ids(
        discoverPenpals(
          database,
          CURRENT_USER_ID,
          createCriteria({ country: '中国' }),
        ).items,
      ),
    ).toEqual(['alice', 'carol']);
    expect(
      ids(
        discoverPenpals(
          database,
          CURRENT_USER_ID,
          createCriteria({ city: '杭州' }),
        ).items,
      ),
    ).toEqual(['alice', 'carol']);
    expect(
      ids(
        discoverPenpals(
          database,
          CURRENT_USER_ID,
          createCriteria({ interestIds: ['reading'] }),
        ).items,
      ),
    ).toEqual(['alice']);
    expect(
      ids(
        discoverPenpals(
          database,
          CURRENT_USER_ID,
          createCriteria({ interestIds: ['reading', 'music'] }),
        ).items,
      ),
    ).toEqual(['alice', 'carol']);
  });

  it('paginates non-recommended results without duplicates or omissions', () => {
    for (const id of [
      'penpal-a',
      'penpal-b',
      'penpal-c',
      'penpal-d',
      'penpal-e',
    ]) {
      seedUser(database, id);
    }

    const pages = collectPages(
      database,
      createCriteria({ limit: 2 }),
    );
    const allIds = pages.flat().map((item) => item.id);

    expect(pages.map(ids)).toEqual([
      ['penpal-a', 'penpal-b'],
      ['penpal-c', 'penpal-d'],
      ['penpal-e'],
    ]);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('keeps recommended ordering and pagination stable across requests', () => {
    seedUser(database, 'penpal-a', {
      ageRange: '25-29',
      country: '中国',
      languages: ['中文（简体）', 'English'],
      interestIds: ['reading'],
    });
    seedUser(database, 'penpal-b', {
      ageRange: '30-34',
      country: '日本',
      languages: ['日本語'],
      interestIds: ['music'],
    });
    seedUser(database, 'penpal-c', {
      ageRange: '25-29',
      country: '中国',
      languages: ['English'],
      interestIds: ['reading', 'writing'],
    });
    seedUser(database, 'penpal-d', {
      ageRange: '35-44',
      country: '法国',
      languages: ['Français'],
      interestIds: ['travel'],
    });
    seedUser(database, 'penpal-e', {
      ageRange: '25-29',
      country: '日本',
      languages: ['日本語'],
      interestIds: ['writing'],
    });

    const criteria = createCriteria({ limit: 2, recommend: true });
    const firstPage = discoverPenpals(
      database,
      CURRENT_USER_ID,
      criteria,
    );
    const repeatedFirstPage = discoverPenpals(
      database,
      CURRENT_USER_ID,
      criteria,
    );
    const allIds = collectPages(database, criteria)
      .flat()
      .map((item) => item.id);

    expect(ids(repeatedFirstPage.items)).toEqual(ids(firstPage.items));
    expect(allIds).toHaveLength(5);
    expect(new Set(allIds).size).toBe(allIds.length);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).not.toBeNull();
  });
});
