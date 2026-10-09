import type { MailboxCursor, ParseMailboxQueryResult } from './types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function readOptionalValue(
  searchParams: URLSearchParams,
  key: string,
): string | null {
  const value = searchParams.get(key)?.trim();
  return value ? value : null;
}

function isValidDateString(value: string): boolean {
  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

function decodeCursor(value: string): MailboxCursor | null {
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

    if (
      typeof cursor.primaryAt === 'string' &&
      isValidDateString(cursor.primaryAt) &&
      typeof cursor.createdAt === 'string' &&
      isValidDateString(cursor.createdAt) &&
      typeof cursor.id === 'string' &&
      cursor.id
    ) {
      return {
        primaryAt: cursor.primaryAt,
        createdAt: cursor.createdAt,
        id: cursor.id,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function parseMailboxQuery(
  searchParams: URLSearchParams,
): ParseMailboxQueryResult {
  const errors: Record<string, string> = {};
  const rawLimit = readOptionalValue(searchParams, 'limit');
  const limit = rawLimit === null ? DEFAULT_LIMIT : Number(rawLimit);
  const rawCursor = readOptionalValue(searchParams, 'cursor');
  const cursor = rawCursor === null ? null : decodeCursor(rawCursor);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    errors.limit = `limit 必须是 1 到 ${MAX_LIMIT} 之间的整数`;
  }

  if (rawCursor !== null && cursor === null) {
    errors.cursor = 'cursor 参数无效';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    criteria: {
      limit,
      cursor,
    },
  };
}

export function encodeMailboxCursor(cursor: MailboxCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export interface InboxSearchParams {
  [key: string]: string | string[] | undefined;
}

export function createMailboxSearchParams(
  input: InboxSearchParams,
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
