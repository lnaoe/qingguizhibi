import type {
  ParseRelationshipQueryResult,
  ParseRelationshipLettersQueryResult,
  RelationshipCriteria,
  RelationshipCursor,
  RelationshipLetterCursor,
  RelationshipLettersCriteria,
  RelationshipStatus,
} from './types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const KNOWN_STATUSES = new Set<RelationshipStatus>(['active', 'ended']);

export interface RelationshipSearchParams {
  [key: string]: string | string[] | undefined;
}

export function createRelationshipSearchParams(
  input: RelationshipSearchParams,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
      continue;
    }

    if (value !== undefined) {
      searchParams.set(key, value);
    }
  }

  return searchParams;
}

function readOptionalValue(
  searchParams: URLSearchParams,
  key: string,
): string | null {
  const value = searchParams.get(key)?.trim();
  return value ? value : null;
}

function decodeBase64Json(value: string): Record<string, unknown> | null {
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

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readIsoString(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null;
}

function decodeCursor(value: string): RelationshipCursor | null {
  const cursor = decodeBase64Json(value);

  if (!cursor) {
    return null;
  }

  const startedAt = readIsoString(cursor.startedAt);

  if (
    cursor.type === 'started_at' &&
    startedAt !== null &&
    typeof cursor.id === 'string' &&
    cursor.id
  ) {
    return {
      type: 'started_at',
      startedAt,
      id: cursor.id,
    };
  }

  return null;
}

function decodeLetterCursor(value: string): RelationshipLetterCursor | null {
  const cursor = decodeBase64Json(value);

  if (!cursor) {
    return null;
  }

  const sentAt = readIsoString(cursor.sentAt);

  if (
    cursor.type === 'sent_at' &&
    sentAt !== null &&
    typeof cursor.id === 'string' &&
    cursor.id
  ) {
    return {
      type: 'sent_at',
      sentAt,
      id: cursor.id,
    };
  }

  return null;
}

export function parseRelationshipQuery(
  searchParams: URLSearchParams,
): ParseRelationshipQueryResult {
  const errors: Record<string, string> = {};
  const rawLimit = readOptionalValue(searchParams, 'limit');
  const limit = rawLimit === null ? DEFAULT_LIMIT : Number(rawLimit);
  const rawStatus = readOptionalValue(searchParams, 'status');
  const status =
    rawStatus === null || rawStatus === 'all'
      ? null
      : (rawStatus as RelationshipStatus);
  const rawCursor = readOptionalValue(searchParams, 'cursor');
  const cursor = rawCursor === null ? null : decodeCursor(rawCursor);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    errors.limit = `limit 必须是 1 到 ${MAX_LIMIT} 之间的整数`;
  }

  if (status !== null && !KNOWN_STATUSES.has(status)) {
    errors.status = 'status 参数无效';
  }

  if (rawCursor !== null && cursor === null) {
    errors.cursor = 'cursor 参数无效';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const criteria: RelationshipCriteria = {
    status,
    cursor,
    limit,
  };

  return { ok: true, criteria };
}

export function encodeRelationshipCursor(cursor: RelationshipCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function parseRelationshipLettersQuery(
  searchParams: URLSearchParams,
): ParseRelationshipLettersQueryResult {
  const errors: Record<string, string> = {};
  const rawLimit = readOptionalValue(searchParams, 'limit');
  const limit = rawLimit === null ? DEFAULT_LIMIT : Number(rawLimit);
  const rawCursor = readOptionalValue(searchParams, 'cursor');
  const cursor = rawCursor === null ? null : decodeLetterCursor(rawCursor);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    errors.limit = `limit 必须是 1 到 ${MAX_LIMIT} 之间的整数`;
  }

  if (rawCursor !== null && cursor === null) {
    errors.cursor = 'cursor 参数无效';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const criteria: RelationshipLettersCriteria = {
    cursor,
    limit,
  };

  return { ok: true, criteria };
}

export function encodeRelationshipLetterCursor(
  cursor: RelationshipLetterCursor,
): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}
