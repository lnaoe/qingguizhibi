import { describe, expect, it } from 'vitest';
import {
  createMailboxSearchParams,
  encodeMailboxCursor,
  parseMailboxQuery,
} from './query';

describe('mailbox query', () => {
  it('uses the default inbox limit', () => {
    const result = parseMailboxQuery(new URLSearchParams());

    expect(result).toEqual({
      ok: true,
      criteria: {
        limit: 20,
        cursor: null,
      },
    });
  });

  it('parses a stable cursor', () => {
    const cursor = encodeMailboxCursor({
      primaryAt: '2026-01-03T08:00:00.000Z',
      createdAt: '2026-01-02T08:00:00.000Z',
      id: 'letter-1',
    });

    const result = parseMailboxQuery(
      new URLSearchParams({
        limit: '10',
        cursor,
      }),
    );

    expect(result).toEqual({
      ok: true,
      criteria: {
        limit: 10,
        cursor: {
          primaryAt: '2026-01-03T08:00:00.000Z',
          createdAt: '2026-01-02T08:00:00.000Z',
          id: 'letter-1',
        },
      },
    });
  });

  it('rejects invalid limits and cursors', () => {
    const invalidLimit = parseMailboxQuery(
      new URLSearchParams({ limit: '51' }),
    );
    const invalidCursor = parseMailboxQuery(
      new URLSearchParams({ cursor: 'not-a-cursor' }),
    );

    expect(invalidLimit).toEqual({
      ok: false,
      errors: {
        limit: 'limit 必须是 1 到 50 之间的整数',
      },
    });
    expect(invalidCursor).toEqual({
      ok: false,
      errors: {
        cursor: 'cursor 参数无效',
      },
    });
  });

  it('creates URLSearchParams from Next searchParams', () => {
    const searchParams = createMailboxSearchParams({
      limit: '3',
      cursor: 'cursor-value',
    });

    expect(searchParams.get('limit')).toBe('3');
    expect(searchParams.get('cursor')).toBe('cursor-value');
  });
});
