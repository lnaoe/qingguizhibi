import type {
  LetterFieldErrors,
  LetterValidationResult,
} from './types';

export const LETTER_SUBJECT_MAX_LENGTH = 80;
export const LETTER_BODY_MAX_LENGTH = 5000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function validateLetterDraft(
  input: unknown,
): LetterValidationResult {
  const record = isRecord(input) ? input : {};
  const subject = readString(record.subject).trim();
  const body = readString(record.body).trim();
  const errors: LetterFieldErrors = {};

  if (!subject) {
    errors.subject = '请写下这封信的主题';
  } else if (subject.length > LETTER_SUBJECT_MAX_LENGTH) {
    errors.subject = `主题不能超过 ${LETTER_SUBJECT_MAX_LENGTH} 个字符`;
  }

  if (!body) {
    errors.body = '请写下想对这个人说的话';
  } else if (body.length > LETTER_BODY_MAX_LENGTH) {
    errors.body = `正文不能超过 ${LETTER_BODY_MAX_LENGTH} 个字符`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    values: {
      subject,
      body,
    },
  };
}
