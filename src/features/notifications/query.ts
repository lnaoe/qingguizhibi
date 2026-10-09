import type {
  NotificationCriteria,
  NotificationCursor,
  ParseNotificationQueryResult,
} from './types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function readOptionalValue(
  searchParams: URLSearchParams,
  key: string,
): string | null {
  const value = searchParams.get(key)?.trim();
  return value ? value : null;
}

function decodeCursor(value: string): NotificationCursor | null {
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

    if (typeof cursor.id !== 'string' || !cursor.id) {
      return null;
    }

    if (typeof cursor.createdAt !== 'string') {
      return null;
    }

    const createdAt = new Date(cursor.createdAt);

    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }

    return { id: cursor.id, createdAt: createdAt.toISOString() };
  } catch {
    return null;
  }
}

export function parseNotificationQuery(
  searchParams: URLSearchParams,
): ParseNotificationQueryResult {
  const errors: Record<string, string> = {};
  const rawLimit = readOptionalValue(searchParams, 'limit');
  const limit = rawLimit === null ? DEFAULT_LIMIT : Number(rawLimit);
  const rawUnreadOnly = readOptionalValue(searchParams, 'unread_only');
  const unreadOnly = rawUnreadOnly === null ? false : rawUnreadOnly === 'true';
  const rawCursor = readOptionalValue(searchParams, 'cursor');
  const cursor = rawCursor === null ? null : decodeCursor(rawCursor);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    errors.limit = `limit 必须是 1 到 ${MAX_LIMIT} 之间的整数`;
  }

  if (
    rawUnreadOnly !== null &&
    rawUnreadOnly !== 'true' &&
    rawUnreadOnly !== 'false'
  ) {
    errors.unread_only = 'unread_only 必须是 true 或 false';
  }

  if (rawCursor !== null && cursor === null) {
    errors.cursor = 'cursor 参数无效';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const criteria: NotificationCriteria = {
    unreadOnly,
    limit,
    cursor,
  };

  return { ok: true, criteria };
}

export function encodeNotificationCursor(cursor: NotificationCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}
