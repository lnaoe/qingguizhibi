import { describe, expect, it } from 'vitest';
import {
  LETTER_BODY_MAX_LENGTH,
  LETTER_SUBJECT_MAX_LENGTH,
  validateLetterDraft,
} from './validation';

describe('letter validation', () => {
  it('rejects missing subject and body', () => {
    const result = validateLetterDraft({
      subject: '   ',
      body: '',
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        subject: '请写下这封信的主题',
        body: '请写下想对这个人说的话',
      },
    });
  });

  it('accepts a valid letter and normalizes whitespace', () => {
    const result = validateLetterDraft({
      subject: '  你好  ',
      body: '  很高兴认识你。  ',
    });

    expect(result).toEqual({
      ok: true,
      values: {
        subject: '你好',
        body: '很高兴认识你。',
      },
    });
  });

  it('rejects a subject over the maximum length', () => {
    const result = validateLetterDraft({
      subject: '主'.repeat(LETTER_SUBJECT_MAX_LENGTH + 1),
      body: '很高兴认识你。',
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        subject: `主题不能超过 ${LETTER_SUBJECT_MAX_LENGTH} 个字符`,
      },
    });
  });

  it('rejects a body over the maximum length', () => {
    const result = validateLetterDraft({
      subject: '你好',
      body: '字'.repeat(LETTER_BODY_MAX_LENGTH + 1),
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        body: `正文不能超过 ${LETTER_BODY_MAX_LENGTH} 个字符`,
      },
    });
  });

  it('treats non-string field values as missing', () => {
    const result = validateLetterDraft({
      subject: null,
      body: 123,
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        subject: '请写下这封信的主题',
        body: '请写下想对这个人说的话',
      },
    });
  });
});
