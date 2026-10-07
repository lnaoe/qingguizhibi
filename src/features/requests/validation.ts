import { validateLetterDraft } from '../letters/validation';
import type {
  CreateFirstContactFieldErrors,
  CreateFirstContactValidationResult,
} from './types';

const RECEIVER_ID_MAX_LENGTH = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateCreateFirstContact(
  input: unknown,
): CreateFirstContactValidationResult {
  const record = isRecord(input) ? input : {};
  const receiverId =
    typeof record.receiver_id === 'string' ? record.receiver_id.trim() : '';
  const errors: CreateFirstContactFieldErrors = {};
  const letterValidation = validateLetterDraft(record);

  if (!receiverId) {
    errors.receiver_id = '请选择收件人';
  } else if (receiverId.length > RECEIVER_ID_MAX_LENGTH) {
    errors.receiver_id = '收件人信息无效';
  }

  if (!letterValidation.ok) {
    Object.assign(errors, letterValidation.errors);
  }

  if (Object.keys(errors).length > 0 || !letterValidation.ok) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    values: {
      receiverId,
      ...letterValidation.values,
    },
  };
}
