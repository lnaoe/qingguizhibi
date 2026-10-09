import { describe, expect, it } from 'vitest';
import {
  LETTER_BODY_MAX_LENGTH,
  LETTER_SUBJECT_MAX_LENGTH,
  validateCreateLetterDraft,
  validateLetterDraft,
  validateReplyLetter,
  validateUpdateLetterDraft,
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

describe('reply letter validation', () => {
  it('allows a blank subject when the reply body is present', () => {
    const result = validateReplyLetter({
      subject: '   ',
      body: '  很高兴收到你的来信。  ',
    });

    expect(result).toEqual({
      ok: true,
      values: {
        subject: '',
        body: '很高兴收到你的来信。',
      },
    });
  });

  it('requires a non-empty body before sending', () => {
    const result = validateReplyLetter({
      subject: '回信',
      body: '   ',
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        body: '请写下想对这位笔友说的话',
      },
    });
  });
});

describe('letter draft validation', () => {
  it('accepts an incomplete draft and normalizes whitespace', () => {
    const result = validateCreateLetterDraft({
      relationship_id: ' relationship-1 ',
      subject: '  你好  ',
      body: '',
    });

    expect(result).toEqual({
      ok: true,
      values: {
        relationshipId: 'relationship-1',
        subject: '你好',
        body: '',
      },
    });
  });

  it('requires a relationship and validates field formats', () => {
    const result = validateCreateLetterDraft({
      relationship_id: '',
      subject: null,
      body: '字'.repeat(LETTER_BODY_MAX_LENGTH + 1),
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        relationship_id: '请选择收件人',
        subject: '主题格式无效',
        body: `正文不能超过 ${LETTER_BODY_MAX_LENGTH} 个字符`,
      },
    });
  });

  it('accepts a partial draft update', () => {
    const result = validateUpdateLetterDraft({
      subject: '  新主题  ',
    });

    expect(result).toEqual({
      ok: true,
      values: {
        subject: '新主题',
      },
    });
  });

  it('rejects an empty draft update', () => {
    const result = validateUpdateLetterDraft({});

    expect(result).toEqual({
      ok: false,
      errors: {
        request: '请提供要修改的内容',
      },
    });
  });
});
