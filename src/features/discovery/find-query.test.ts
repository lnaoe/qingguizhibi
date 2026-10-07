import { describe, expect, it } from 'vitest';
import { createDiscoverySearchParams } from './find-query';
import { parseDiscoveryQuery } from './query';

describe('createDiscoverySearchParams', () => {
  it('defaults to recommendation sorting and preserves repeated interests', () => {
    const searchParams = createDiscoverySearchParams({
      age_range: '25-29',
      interest_ids: ['reading', 'writing'],
      country: '中国',
    });
    const result = parseDiscoveryQuery(searchParams);

    expect(result).toEqual({
      ok: true,
      criteria: {
        limit: 20,
        cursor: null,
        ageRange: '25-29',
        language: null,
        country: '中国',
        city: null,
        interestIds: ['reading', 'writing'],
        recommend: true,
      },
    });
  });

  it('preserves an explicit non-recommended sort', () => {
    const searchParams = createDiscoverySearchParams({
      recommend: 'false',
      city: '杭州',
    });
    const result = parseDiscoveryQuery(searchParams);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.criteria.recommend).toBe(false);
      expect(result.criteria.city).toBe('杭州');
    }
  });
});
