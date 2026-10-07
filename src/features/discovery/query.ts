import {
  AGE_RANGE_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
} from '../onboarding/options';
import type {
  DiscoveryCursor,
  DiscoveryCriteria,
  ParseDiscoveryQueryResult,
} from './types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const KNOWN_AGE_RANGES = new Set<string>(AGE_RANGE_OPTIONS);
const KNOWN_LANGUAGES = new Set<string>(LANGUAGE_OPTIONS);
const KNOWN_INTEREST_IDS = new Set(
  INTEREST_OPTIONS.map((interest) => interest.id),
);

function readOptionalValue(
  searchParams: URLSearchParams,
  key: string,
): string | null {
  const value = searchParams.get(key)?.trim();
  return value ? value : null;
}

function readInterestIds(searchParams: URLSearchParams): string[] {
  return [
    ...new Set(
      searchParams
        .getAll('interest_ids')
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

function decodeCursor(value: string): DiscoveryCursor | null {
  if (!value || value.length > 1000) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    const cursor = parsed as Record<string, unknown>;

    if (cursor.type === 'id' && typeof cursor.id === 'string' && cursor.id) {
      return { type: 'id', id: cursor.id };
    }

    if (
      cursor.type === 'recommend' &&
      typeof cursor.id === 'string' &&
      cursor.id &&
      typeof cursor.score === 'number' &&
      Number.isFinite(cursor.score)
    ) {
      return {
        type: 'recommend',
        id: cursor.id,
        score: cursor.score,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function parseDiscoveryQuery(
  searchParams: URLSearchParams,
): ParseDiscoveryQueryResult {
  const errors: Record<string, string> = {};
  const rawLimit = readOptionalValue(searchParams, 'limit');
  const limit = rawLimit === null ? DEFAULT_LIMIT : Number(rawLimit);
  const rawRecommend = readOptionalValue(searchParams, 'recommend');
  const recommend =
    rawRecommend === null ? false : rawRecommend === 'true';
  const ageRange = readOptionalValue(searchParams, 'age_range');
  const language = readOptionalValue(searchParams, 'language');
  const country = readOptionalValue(searchParams, 'country');
  const city = readOptionalValue(searchParams, 'city');
  const interestIds = readInterestIds(searchParams);
  const rawCursor = readOptionalValue(searchParams, 'cursor');
  const cursor = rawCursor === null ? null : decodeCursor(rawCursor);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    errors.limit = `limit 必须是 1 到 ${MAX_LIMIT} 之间的整数`;
  }

  if (
    rawRecommend !== null &&
    rawRecommend !== 'true' &&
    rawRecommend !== 'false'
  ) {
    errors.recommend = 'recommend 必须是 true 或 false';
  }

  if (ageRange && !KNOWN_AGE_RANGES.has(ageRange)) {
    errors.age_range = 'age_range 参数无效';
  }

  if (language && !KNOWN_LANGUAGES.has(language)) {
    errors.language = 'language 参数无效';
  }

  if (country && country.length > 50) {
    errors.country = 'country 不能超过 50 个字符';
  }

  if (city && city.length > 50) {
    errors.city = 'city 不能超过 50 个字符';
  }

  if (
    interestIds.length > 0 &&
    interestIds.some((interestId) => !KNOWN_INTEREST_IDS.has(interestId))
  ) {
    errors.interest_ids = 'interest_ids 包含无效兴趣';
  }

  if (rawCursor !== null && cursor === null) {
    errors.cursor = 'cursor 参数无效';
  }

  if (
    cursor &&
    ((recommend && cursor.type !== 'recommend') ||
      (!recommend && cursor.type !== 'id'))
  ) {
    errors.cursor = 'cursor 与排序方式不匹配';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const criteria: DiscoveryCriteria = {
    limit,
    cursor,
    ageRange,
    language,
    country,
    city,
    interestIds,
    recommend,
  };

  return { ok: true, criteria };
}

export function encodeDiscoveryCursor(cursor: DiscoveryCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}
