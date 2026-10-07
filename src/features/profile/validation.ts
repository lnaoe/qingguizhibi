import { validateOnboardingValues } from '../onboarding/validation';
import { PROFILE_VISIBILITY_OPTIONS } from './options';
import type {
  ProfileErrors,
  ProfileValidationResult,
  ProfileValues,
} from './types';

const KNOWN_VISIBILITY_VALUES = new Set<string>(PROFILE_VISIBILITY_OPTIONS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateProfileValues(
  input: unknown,
): ProfileValidationResult {
  const record = isRecord(input) ? input : {};
  const visibility =
    typeof record.visibility === 'string' ? record.visibility : '';
  const baseValidation = validateOnboardingValues(input);
  const errors: ProfileErrors = baseValidation.ok
    ? {}
    : { ...baseValidation.errors };

  if (!KNOWN_VISIBILITY_VALUES.has(visibility)) {
    errors.visibility = '请选择资料可见范围';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  if (!baseValidation.ok) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    values: {
      ...baseValidation.values,
      visibility: visibility as ProfileValues['visibility'],
    },
  };
}
