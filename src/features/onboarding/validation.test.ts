import { describe, expect, it } from 'vitest';
import { EMPTY_ONBOARDING_VALUES } from './options';
import { validateOnboardingValues } from './validation';
import type { OnboardingValues } from './types';

function createValidValues(): OnboardingValues {
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
  };
}

describe('onboarding validation', () => {
  it('accepts and normalizes a complete profile', () => {
    const result = validateOnboardingValues({
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

  it('requires at least three known interests', () => {
    const result = validateOnboardingValues({
      ...createValidValues(),
      interestIds: ['reading', 'writing'],
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        interestIds: '请至少选择 3 个兴趣',
      },
    });
  });

  it('rejects an invalid avatar URL', () => {
    const result = validateOnboardingValues({
      ...createValidValues(),
      avatarUrl: 'not-a-url',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.avatarUrl).toBe('请输入有效的 HTTP(S) 图片地址');
    }
  });

  it('rejects missing required profile fields', () => {
    const result = validateOnboardingValues(EMPTY_ONBOARDING_VALUES);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        nickname: '请输入昵称',
        country: '请输入国家或地区',
        city: '请输入城市',
        ageRange: '请选择年龄段',
        languages: '请至少选择一种语言',
        interestIds: '请至少选择 3 个兴趣',
        bio: '请写一点关于自己的介绍',
        penpalReasons: '请至少选择一个动机',
      });
    }
  });
});
