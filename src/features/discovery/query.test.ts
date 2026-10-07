import { describe, expect, it } from 'vitest';
import {
  encodeDiscoveryCursor,
  parseDiscoveryQuery,
} from './query';

describe('parseDiscoveryQuery', () => {
  it('applies the default limit and non-recommended sorting', () => {
    const result = parseDiscoveryQuery(new URLSearchParams());

    expect(result).toEqual({
      ok: true,
      criteria: {
        limit: 20,
        cursor: null,
        ageRange: null,
        language: null,
        country: null,
        city: null,
        interestIds: [],
        recommend: false,
      },
    });
  });

  it('parses filters, repeated interests and a matching cursor', () => {
    const cursor = encodeDiscoveryCursor({
      type: 'recommend',
      id: 'user-20',
      score: 42,
    });
    const result = parseDiscoveryQuery(
      new URLSearchParams([
        ['limit', '10'],
        ['cursor', cursor],
        ['age_range', '25-29'],
        ['language', 'English'],
        ['country', '中国'],
        ['city', '杭州'],
        ['interest_ids', 'reading,writing'],
        ['interest_ids', 'reading'],
        ['recommend', 'true'],
      ]),
    );

    expect(result).toEqual({
      ok: true,
      criteria: {
        limit: 10,
        cursor: {
          type: 'recommend',
          id: 'user-20',
          score: 42,
        },
        ageRange: '25-29',
        language: 'English',
        country: '中国',
        city: '杭州',
        interestIds: ['reading', 'writing'],
        recommend: true,
      },
    });
  });

  it('rejects invalid filter values', () => {
    const result = parseDiscoveryQuery(
      new URLSearchParams({
        limit: '51',
        age_range: 'unknown',
        language: 'Klingon',
        country: 'x'.repeat(51),
        city: 'y'.repeat(51),
        interest_ids: 'unknown',
        recommend: 'yes',
      }),
    );

    expect(result).toEqual({
      ok: false,
      errors: {
        limit: 'limit 必须是 1 到 50 之间的整数',
        recommend: 'recommend 必须是 true 或 false',
        age_range: 'age_range 参数无效',
        language: 'language 参数无效',
        country: 'country 不能超过 50 个字符',
        city: 'city 不能超过 50 个字符',
        interest_ids: 'interest_ids 包含无效兴趣',
      },
    });
  });

  it('rejects a cursor for the wrong ordering', () => {
    const idCursor = encodeDiscoveryCursor({
      type: 'id',
      id: 'user-20',
    });
    const result = parseDiscoveryQuery(
      new URLSearchParams({
        cursor: idCursor,
        recommend: 'true',
      }),
    );

    expect(result).toEqual({
      ok: false,
      errors: {
        cursor: 'cursor 与排序方式不匹配',
      },
    });
  });

  it('rejects malformed cursors', () => {
    const result = parseDiscoveryQuery(
      new URLSearchParams({ cursor: 'not-a-cursor' }),
    );

    expect(result).toEqual({
      ok: false,
      errors: {
        cursor: 'cursor 参数无效',
      },
    });
  });
});
