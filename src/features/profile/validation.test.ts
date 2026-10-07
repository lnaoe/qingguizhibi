import { describe, expect, it } from 'vitest';
import { EMPTY_ONBOARDING_VALUES } from '../onboarding/options';
import type { ProfileValues } from './types';
import { validateProfileValues } from './validation';

function createValidValues(): ProfileValues {
  return {
    ...EMPTY_ONBOARDING_VALUES,
    nickname: '纸笔',
    country: '中国',
    city: '杭州',
    ageRange: '25-29',
    languages: ['中文（简体）'],
    interestIds: ['reading', 'writing', 'music'],
    bio: '喜欢阅读、散步和慢慢写信。',
    penpalReasons: ['分享日常生活', '找到长期笔友'],
    visibility: 'public',
  };
}

describe('profile validation', () => {
  it('accepts a complete profile and normalizes its fields', () => {
    const result = validateProfileValues({
      ...createValidValues(),
      nickname: '  纸笔  ',
      languages: ['中文（简体）', '中文（简体）'],
    });

    expect(result).toEqual({
      ok: true,
      values: {
        ...createValidValues(),
        nickname: '纸笔',
      },
    });
  });

  it('requires a known visibility value', () => {
    const result = validateProfileValues({
      ...createValidValues(),
      visibility: 'friends-only',
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        visibility: '请选择资料可见范围',
      },
    });
  });

  it('requires at least three known interests', () => {
    const result = validateProfileValues({
      ...createValidValues(),
      interestIds: ['reading', 'writing'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.interestIds).toBe('请至少选择 3 个兴趣');
    }
  });
});
