import { asc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import { interests, profiles, userInterests } from '../../db/schema';
import { INTEREST_OPTIONS } from '../onboarding/options';
import {
  getOnboardingSnapshot,
  PENPAL_REASON_SEPARATOR,
} from '../onboarding/service';
import type {
  ProfileSnapshot,
  ProfileValues,
  SaveProfileResult,
} from './types';
import { validateProfileValues } from './validation';

export function getProfileSnapshot(
  database: AppDatabase,
  userId: string,
): ProfileSnapshot | null {
  const onboardingSnapshot = getOnboardingSnapshot(database, userId);

  if (!onboardingSnapshot.onboardingCompleted) {
    return null;
  }

  const profile = database
    .select({ visibility: profiles.visibility })
    .from(profiles)
    .where(eq(profiles.userId, userId))
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
    values: {
      ...onboardingSnapshot.values,
      interestIds: selectedInterests.map((interest) => interest.id),
      visibility: profile.visibility,
    },
    interests: selectedInterests,
  };
}

export function saveProfile(
  database: AppDatabase,
  userId: string,
  input: unknown,
): SaveProfileResult {
  const validation = validateProfileValues(input);

  if (!validation.ok) {
    return validation;
  }

  const values: ProfileValues = validation.values;
  const now = new Date();

  const didUpdate = database.transaction((transaction) => {
    const currentProfile = transaction
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .get();

    if (!currentProfile) {
      return false;
    }

    transaction
      .update(profiles)
      .set({
        nickname: values.nickname,
        avatarUrl: values.avatarUrl || null,
        country: values.country,
        city: values.city,
        ageRange: values.ageRange,
        bio: values.bio,
        penpalReason: values.penpalReasons.join(PENPAL_REASON_SEPARATOR),
        languages: values.languages,
        visibility: values.visibility,
        updatedAt: now,
      })
      .where(eq(profiles.userId, userId))
      .run();

    transaction
      .delete(userInterests)
      .where(eq(userInterests.userId, userId))
      .run();

    transaction
      .insert(interests)
      .values(
        INTEREST_OPTIONS.map((interest) => ({
          id: interest.id,
          name: interest.name,
          slug: interest.slug,
          category: interest.category,
        })),
      )
      .onConflictDoNothing()
      .run();

    transaction
      .insert(userInterests)
      .values(
        values.interestIds.map((interestId) => ({
          userId,
          interestId,
        })),
      )
      .run();

    return true;
  });

  if (!didUpdate) {
    return {
      ok: false,
      formError: '资料尚未完成，请先完成认识自己。',
    };
  }

  return { ok: true };
}
