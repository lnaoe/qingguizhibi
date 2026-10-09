import { describe, expect, it } from 'vitest';
import { encodeNotificationCursor, parseNotificationQuery } from './query';

function toParams(record: Record<string, string>): URLSearchParams {
  return new URLSearchParams(record);
}

describe('parseNotificationQuery', () => {
  it('falls back to the default criteria', () => {
    expect(parseNotificationQuery(toParams({}))).toEqual({
      ok: true,
      criteria: { unreadOnly: false, limit: 20, cursor: null },
    });
  });

  it('parses unread_only, limit and a cursor', () => {
    const cursor = {
      createdAt: '2026-01-02T03:04:05.000Z',
      id: 'notification-1',
    };

    expect(
      parseNotificationQuery(
        toParams({
          unread_only: 'true',
          limit: '5',
          cursor: encodeNotificationCursor(cursor),
        }),
      ),
    ).toEqual({
      ok: true,
      criteria: { unreadOnly: true, limit: 5, cursor },
    });
  });

  it('accepts unread_only=false explicitly', () => {
    expect(parseNotificationQuery(toParams({ unread_only: 'false' }))).toEqual({
      ok: true,
      criteria: { unreadOnly: false, limit: 20, cursor: null },
    });
  });

  it('rejects an out-of-range limit', () => {
    const result = parseNotificationQuery(toParams({ limit: '51' }));

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors.limit).toBeDefined();
    }
  });

  it('rejects a non-numeric limit', () => {
    const result = parseNotificationQuery(toParams({ limit: 'abc' }));

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors.limit).toBeDefined();
    }
  });

  it('rejects an invalid unread_only value', () => {
    const result = parseNotificationQuery(toParams({ unread_only: 'yes' }));

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors.unread_only).toBeDefined();
    }
  });

  it('rejects an undecodable cursor', () => {
    const result = parseNotificationQuery(toParams({ cursor: 'not-a-cursor' }));

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors.cursor).toBeDefined();
    }
  });

  it('rejects a cursor with an invalid date', () => {
    const cursor = Buffer.from(
      JSON.stringify({ id: 'notification-1', createdAt: 'not-a-date' }),
      'utf8',
    ).toString('base64url');
    const result = parseNotificationQuery(toParams({ cursor }));

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors.cursor).toBeDefined();
    }
  });
});
