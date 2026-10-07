import {
  and,
  asc,
  desc,
  eq,
  exists,
  gt,
  inArray,
  lt,
  notExists,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import {
  blocks,
  interests,
  penpalRelationships,
  profiles,
  userInterests,
  users,
} from '../../db/schema';
import { getKnownPenpalReasons } from '../onboarding/service';
import { encodeDiscoveryCursor } from './query';
import type {
  DiscoveryCriteria,
  DiscoveryInterest,
  DiscoveryPage,
  DiscoveryPenpal,
  PublicPenpalProfile,
} from './types';

function getCandidateRelationshipCondition(
  database: AppDatabase,
  currentUserId: string,
) {
  return notExists(
    database
      .select({ id: penpalRelationships.id })
      .from(penpalRelationships)
      .where(
        or(
          and(
            eq(penpalRelationships.userLowId, currentUserId),
            eq(penpalRelationships.userHighId, profiles.userId),
          ),
          and(
            eq(penpalRelationships.userHighId, currentUserId),
            eq(penpalRelationships.userLowId, profiles.userId),
          ),
        ),
      ),
  );
}

function getCandidateBlockCondition(
  database: AppDatabase,
  currentUserId: string,
) {
  return notExists(
    database
      .select({ id: blocks.id })
      .from(blocks)
      .where(
        or(
          and(
            eq(blocks.blockerId, currentUserId),
            eq(blocks.blockedId, profiles.userId),
          ),
          and(
            eq(blocks.blockerId, profiles.userId),
            eq(blocks.blockedId, currentUserId),
          ),
        ),
      ),
  );
}

function getLanguageCondition(language: string): SQL {
  return sql`EXISTS (
    SELECT 1
    FROM json_each(${profiles.languages}) AS candidate_language
    WHERE candidate_language.value = ${language}
  )`;
}

function getSharedInterestScore(currentUserId: string) {
  return sql<number>`(
    SELECT COUNT(*)
    FROM user_interests AS candidate_interests
    INNER JOIN user_interests AS current_interests
      ON candidate_interests.interest_id = current_interests.interest_id
    WHERE candidate_interests.user_id = ${profiles.userId}
      AND current_interests.user_id = ${currentUserId}
  )`;
}

function getStableJitter(userId: SQL | typeof profiles.userId) {
  return sql<number>`(
    (
      COALESCE(unicode(substr(${userId}, 1, 1)), 0) * 31 +
      COALESCE(unicode(substr(${userId}, 2, 1)), 0) * 17 +
      COALESCE(unicode(substr(${userId}, 3, 1)), 0) * 7 +
      length(${userId})
    ) % 100
  )`;
}

function getRecommendationScore(
  database: AppDatabase,
  currentUserId: string,
) {
  const currentProfile = database
    .select({
      ageRange: profiles.ageRange,
      country: profiles.country,
      languages: profiles.languages,
    })
    .from(profiles)
    .where(eq(profiles.userId, currentUserId))
    .get();

  const sharedInterestScore = getSharedInterestScore(currentUserId);
  const ageScore = currentProfile?.ageRange
    ? sql<number>`CASE WHEN ${profiles.ageRange} = ${currentProfile.ageRange} THEN 1 ELSE 0 END`
    : sql<number>`0`;
  const countryScore = currentProfile?.country
    ? sql<number>`CASE WHEN ${profiles.country} = ${currentProfile.country} THEN 1 ELSE 0 END`
    : sql<number>`0`;
  const languageScore =
    currentProfile && currentProfile.languages.length > 0
      ? sql<number>`EXISTS (
          SELECT 1
          FROM json_each(${profiles.languages}) AS candidate_language
          WHERE candidate_language.value IN (
            ${sql.join(
              currentProfile.languages.map((language) => sql`${language}`),
              sql`, `,
            )}
          )
        )`
      : sql<number>`0`;

  return sql<number>`(
    ${sharedInterestScore} * 10 +
    (${ageScore} + ${countryScore} + ${languageScore}) * 3 +
    ${getStableJitter(profiles.userId)}
  )`;
}

function getInterestRows(
  database: AppDatabase,
  userIds: string[],
): Map<string, DiscoveryInterest[]> {
  const groupedInterests = new Map<string, DiscoveryInterest[]>();

  if (userIds.length === 0) {
    return groupedInterests;
  }

  const rows = database
    .select({
      userId: userInterests.userId,
      id: interests.id,
      name: interests.name,
      slug: interests.slug,
      category: interests.category,
    })
    .from(userInterests)
    .innerJoin(interests, eq(userInterests.interestId, interests.id))
    .where(inArray(userInterests.userId, userIds))
    .orderBy(asc(userInterests.userId), asc(interests.id))
    .all();

  for (const row of rows) {
    const current = groupedInterests.get(row.userId) ?? [];
    current.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category,
    });
    groupedInterests.set(row.userId, current);
  }

  return groupedInterests;
}

export function discoverPenpals(
  database: AppDatabase,
  currentUserId: string,
  criteria: DiscoveryCriteria,
): DiscoveryPage {
  const conditions: SQL[] = [
    eq(users.status, 'active'),
    eq(profiles.visibility, 'public'),
    eq(profiles.onboardingCompleted, true),
    sql`${profiles.userId} <> ${currentUserId}`,
    getCandidateBlockCondition(database, currentUserId),
    getCandidateRelationshipCondition(database, currentUserId),
  ];

  if (criteria.ageRange) {
    conditions.push(eq(profiles.ageRange, criteria.ageRange));
  }

  if (criteria.language) {
    conditions.push(getLanguageCondition(criteria.language));
  }

  if (criteria.country) {
    conditions.push(eq(profiles.country, criteria.country));
  }

  if (criteria.city) {
    conditions.push(eq(profiles.city, criteria.city));
  }

  if (criteria.interestIds.length > 0) {
    conditions.push(
      exists(
        database
          .select({ interestId: userInterests.interestId })
          .from(userInterests)
          .where(
            and(
              eq(userInterests.userId, profiles.userId),
              inArray(userInterests.interestId, criteria.interestIds),
            ),
          ),
      ),
    );
  }

  const recommendationScore = criteria.recommend
    ? getRecommendationScore(database, currentUserId)
    : null;

  if (criteria.cursor?.type === 'id') {
    conditions.push(gt(profiles.userId, criteria.cursor.id));
  }

  if (
    criteria.cursor?.type === 'recommend' &&
    recommendationScore !== null
  ) {
    conditions.push(
      or(
        lt(recommendationScore, criteria.cursor.score),
        and(
          eq(recommendationScore, criteria.cursor.score),
          gt(profiles.userId, criteria.cursor.id),
        ),
      )!,
    );
  }

  const selection = {
    id: profiles.userId,
    nickname: profiles.nickname,
    avatarUrl: profiles.avatarUrl,
    country: profiles.country,
    city: profiles.city,
    ageRange: profiles.ageRange,
    languages: profiles.languages,
  };

  const query = database
    .select(
      recommendationScore
        ? {
            ...selection,
            recommendationScore,
          }
        : selection,
    )
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(and(...conditions))
    .limit(criteria.limit + 1);

  const rows = recommendationScore
    ? query.orderBy(desc(recommendationScore), asc(profiles.userId)).all()
    : query.orderBy(asc(profiles.userId)).all();

  const hasMore = rows.length > criteria.limit;
  const pageRows = rows.slice(0, criteria.limit);
  const interestsByUser = getInterestRows(
    database,
    pageRows.map((row) => row.id),
  );

  const items: DiscoveryPenpal[] = pageRows.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    avatarUrl: row.avatarUrl,
    country: row.country ?? '',
    city: row.city ?? '',
    ageRange: row.ageRange ?? '',
    languages: row.languages,
    interests: interestsByUser.get(row.id) ?? [],
  }));

  const lastRow = pageRows.at(-1);
  let nextCursor: string | null = null;

  if (hasMore && lastRow) {
    if (recommendationScore) {
      nextCursor = encodeDiscoveryCursor({
        type: 'recommend',
        id: lastRow.id,
        score: Number(
          'recommendationScore' in lastRow
            ? lastRow.recommendationScore
            : 0,
        ),
      });
    } else {
      nextCursor = encodeDiscoveryCursor({
        type: 'id',
        id: lastRow.id,
      });
    }
  }

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export function getPublicPenpalProfile(
  database: AppDatabase,
  userId: string,
  viewerId: string,
): PublicPenpalProfile | null {
  const isOwner = userId === viewerId;

  const profile = database
    .select({
      id: profiles.userId,
      nickname: profiles.nickname,
      avatarUrl: profiles.avatarUrl,
      country: profiles.country,
      city: profiles.city,
      ageRange: profiles.ageRange,
      languages: profiles.languages,
      bio: profiles.bio,
      penpalReason: profiles.penpalReason,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(
      and(
        eq(profiles.userId, userId),
        eq(users.status, 'active'),
        eq(profiles.onboardingCompleted, true),
        isOwner ? undefined : eq(profiles.visibility, 'public'),
      ),
    )
    .get();

  if (!profile) {
    return null;
  }

  const selectedInterests = database
    .select({
      id: interests.id,
      name: interests.name,
      slug: interests.slug,
      category: interests.category,
    })
    .from(userInterests)
    .innerJoin(interests, eq(userInterests.interestId, interests.id))
    .where(eq(userInterests.userId, userId))
    .orderBy(asc(interests.id))
    .all();

  return {
    id: profile.id,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
    country: profile.country ?? '',
    city: profile.city ?? '',
    ageRange: profile.ageRange ?? '',
    languages: profile.languages,
    bio: profile.bio ?? '',
    penpalReasons: getKnownPenpalReasons(profile.penpalReason),
    interests: selectedInterests,
  };
}
