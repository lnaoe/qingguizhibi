import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import { interests, profiles, userInterests, users } from '../../db/schema';
import { INTEREST_OPTIONS, PENPAL_REASON_OPTIONS } from './options';
import type {
  CompleteOnboardingResult,
  OnboardingSnapshot,
  OnboardingValues,
} from './types';
import { validateOnboardingValues } from './validation';

export const PENPAL_REASON_SEPARATOR = '、';

function getEmptySnapshot(): OnboardingSnapshot {
  return {
    onboardingCompleted: false,
    values: {
      nickname: '',
      avatarUrl: '',
      country: '',
      city: '',
      ageRange: '',
      languages: [],
      interestIds: [],
      bio: '',
      penpalReasons: [],
    },
  };
}

export function getKnownPenpalReasons(value: string | null): string[] {
  if (!value) {
    return [];
  }

  const knownReasons = new Set<string>(PENPAL_REASON_OPTIONS);
  return value
    .split(PENPAL_REASON_SEPARATOR)
    .map((reason) => reason.trim())
    .filter((reason) => knownReasons.has(reason));
}

export function getOnboardingSnapshot(
  database: AppDatabase,
  userId: string,
): OnboardingSnapshot {
  const profile = database
    .select({
      nickname: profiles.nickname,
      avatarUrl: profiles.avatarUrl,
      country: profiles.country,
      city: profiles.city,
      ageRange: profiles.ageRange,
      languages: profiles.languages,
      bio: profiles.bio,
      penpalReason: profiles.penpalReason,
      onboardingCompleted: profiles.onboardingCompleted,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .get();

  if (!profile) {
    return getEmptySnapshot();
  }

  const selectedInterestIds = database
    .select({ interestId: userInterests.interestId })
    .from(userInterests)
    .where(eq(userInterests.userId, userId))
    .all()
    .map((row) => row.interestId);

  return {
    onboardingCompleted: profile.onboardingCompleted,
    values: {
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl ?? '',
      country: profile.country ?? '',
      city: profile.city ?? '',
      ageRange: profile.ageRange ?? '',
      languages: profile.languages,
      interestIds: selectedInterestIds,
      bio: profile.bio ?? '',
      penpalReasons: getKnownPenpalReasons(profile.penpalReason),
    },
  };
}

export function saveOnboardingProfile(
  database: AppDatabase,
  userId: string,
  email: string,
  input: unknown,
): CompleteOnboardingResult {
  const validation = validateOnboardingValues(input);

  if (!validation.ok) {
    return validation;
  }

  const values: OnboardingValues = validation.values;
  const now = new Date();

  database.transaction((transaction) => {
    transaction
      .insert(users)
      .values({ id: userId, email })
      .onConflictDoNothing()
      .run();

    transaction
      .insert(profiles)
      .values({
        userId,
        nickname: values.nickname,
        avatarUrl: values.avatarUrl || null,
        country: values.country,
        city: values.city,
        ageRange: values.ageRange,
        bio: values.bio,
        penpalReason: values.penpalReasons.join(PENPAL_REASON_SEPARATOR),
        languages: values.languages,
        onboardingCompleted: true,
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          nickname: values.nickname,
          avatarUrl: values.avatarUrl || null,
          country: values.country,
          city: values.city,
          ageRange: values.ageRange,
          bio: values.bio,
          penpalReason: values.penpalReasons.join(PENPAL_REASON_SEPARATOR),
          languages: values.languages,
          onboardingCompleted: true,
          updatedAt: now,
        },
      })
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
  });

  return { ok: true };
}
