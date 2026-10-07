import {
  AGE_RANGE_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  PENPAL_REASON_OPTIONS,
} from './options';
import type { OnboardingErrors, OnboardingValues } from './types';

export type OnboardingValidationResult =
  | { ok: true; values: OnboardingValues }
  | { ok: false; errors: OnboardingErrors };

const KNOWN_AGE_RANGES = new Set<string>(AGE_RANGE_OPTIONS);
const KNOWN_LANGUAGES = new Set<string>(LANGUAGE_OPTIONS);
const KNOWN_INTEREST_IDS = new Set(
  INTEREST_OPTIONS.map((interest) => interest.id),
);
const KNOWN_PENPAL_REASONS = new Set<string>(PENPAL_REASON_OPTIONS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateOnboardingValues(
  input: unknown,
): OnboardingValidationResult {
  const record = isRecord(input) ? input : {};
  const nickname = readString(record.nickname).trim();
  const avatarUrl = readString(record.avatarUrl).trim();
  const country = readString(record.country).trim();
  const city = readString(record.city).trim();
  const ageRange = readString(record.ageRange).trim();
  const languages = unique(readStringArray(record.languages));
  const interestIds = unique(readStringArray(record.interestIds));
  const bio = readString(record.bio).trim();
  const penpalReasons = unique(readStringArray(record.penpalReasons));
  const errors: OnboardingErrors = {};

  if (!nickname) {
    errors.nickname = '请输入昵称';
  } else if (nickname.length > 30) {
    errors.nickname = '昵称不能超过 30 个字符';
  }

  if (avatarUrl && !isValidHttpUrl(avatarUrl)) {
    errors.avatarUrl = '请输入有效的 HTTP(S) 图片地址';
  }

  if (!country) {
    errors.country = '请输入国家或地区';
  } else if (country.length > 50) {
    errors.country = '国家或地区不能超过 50 个字符';
  }

  if (!city) {
    errors.city = '请输入城市';
  } else if (city.length > 50) {
    errors.city = '城市不能超过 50 个字符';
  }

  if (!KNOWN_AGE_RANGES.has(ageRange)) {
    errors.ageRange = '请选择年龄段';
  }

  if (
    languages.length === 0 ||
    languages.some((language) => !KNOWN_LANGUAGES.has(language))
  ) {
    errors.languages = '请至少选择一种语言';
  }

  if (
    interestIds.length < 3 ||
    interestIds.some((interestId) => !KNOWN_INTEREST_IDS.has(interestId))
  ) {
    errors.interestIds = '请至少选择 3 个兴趣';
  }

  if (!bio) {
    errors.bio = '请写一点关于自己的介绍';
  } else if (bio.length > 500) {
    errors.bio = '自我介绍不能超过 500 个字符';
  }

  if (
    penpalReasons.length === 0 ||
    penpalReasons.some((reason) => !KNOWN_PENPAL_REASONS.has(reason))
  ) {
    errors.penpalReasons = '请至少选择一个动机';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    values: {
      nickname,
      avatarUrl,
      country,
      city,
      ageRange,
      languages,
      interestIds,
      bio,
      penpalReasons,
    },
  };
}
