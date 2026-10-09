import type {
  CreateLetterDraftValidationResult,
  LetterFieldErrors,
  LetterValidationResult,
  UpdateLetterDraftValidationResult,
} from './types';

export const LETTER_SUBJECT_MAX_LENGTH = 80;
export const LETTER_BODY_MAX_LENGTH = 5000;
export const RELATIONSHIP_ID_MAX_LENGTH = 200;

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

export function validateReplyLetter(
  input: unknown,
): LetterValidationResult {
  const record = isRecord(input) ? input : {};
  const subject = readString(record.subject).trim();
  const body = readString(record.body).trim();
  const errors: LetterFieldErrors = {};

  if (subject.length > LETTER_SUBJECT_MAX_LENGTH) {
    errors.subject = `主题不能超过 ${LETTER_SUBJECT_MAX_LENGTH} 个字符`;
  }

  if (!body) {
    errors.body = '请写下想对这位笔友说的话';
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

export function validateCreateLetterDraft(
  input: unknown,
): CreateLetterDraftValidationResult {
  const record = isRecord(input) ? input : {};
  const relationshipId =
    typeof record.relationship_id === 'string'
      ? record.relationship_id.trim()
      : '';
  const subject =
    typeof record.subject === 'string' ? record.subject.trim() : '';
  const body = typeof record.body === 'string' ? record.body.trim() : '';
  const errors: LetterFieldErrors & { relationship_id?: string } = {};

  if (!relationshipId) {
    errors.relationship_id = '请选择收件人';
  } else if (relationshipId.length > RELATIONSHIP_ID_MAX_LENGTH) {
    errors.relationship_id = '收件人信息无效';
  }

  if ('subject' in record && typeof record.subject !== 'string') {
    errors.subject = '主题格式无效';
  } else if (subject.length > LETTER_SUBJECT_MAX_LENGTH) {
    errors.subject = `主题不能超过 ${LETTER_SUBJECT_MAX_LENGTH} 个字符`;
  }

  if ('body' in record && typeof record.body !== 'string') {
    errors.body = '正文格式无效';
  } else if (body.length > LETTER_BODY_MAX_LENGTH) {
    errors.body = `正文不能超过 ${LETTER_BODY_MAX_LENGTH} 个字符`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    values: {
      relationshipId,
      subject,
      body,
    },
  };
}

export function validateUpdateLetterDraft(
  input: unknown,
): UpdateLetterDraftValidationResult {
  const record = isRecord(input) ? input : {};
  const hasSubject = Object.prototype.hasOwnProperty.call(record, 'subject');
  const hasBody = Object.prototype.hasOwnProperty.call(record, 'body');
  const errors: LetterFieldErrors & { request?: string } = {};

  if (!hasSubject && !hasBody) {
    errors.request = '请提供要修改的内容';
  }

  if (
    hasSubject &&
    typeof record.subject !== 'string'
  ) {
    errors.subject = '主题格式无效';
  }

  if (hasBody && typeof record.body !== 'string') {
    errors.body = '正文格式无效';
  }

  if (typeof record.subject === 'string') {
    const subject = record.subject.trim();

    if (subject.length > LETTER_SUBJECT_MAX_LENGTH) {
      errors.subject = `主题不能超过 ${LETTER_SUBJECT_MAX_LENGTH} 个字符`;
    }
  }

  if (typeof record.body === 'string') {
    const body = record.body.trim();

    if (body.length > LETTER_BODY_MAX_LENGTH) {
      errors.body = `正文不能超过 ${LETTER_BODY_MAX_LENGTH} 个字符`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    values: {
      ...(hasSubject
        ? { subject: (record.subject as string).trim() }
        : {}),
      ...(hasBody ? { body: (record.body as string).trim() } : {}),
    },
  };
}
