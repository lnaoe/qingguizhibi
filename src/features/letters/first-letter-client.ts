import type { LetterDraftValues, LetterFieldErrors } from './types';

interface FirstLetterInput extends LetterDraftValues {
  receiverId: string;
}

export type FirstLetterSubmitResult =
  | { ok: true }
  | {
      ok: false;
      errors?: LetterFieldErrors;
      formError?: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFieldErrors(details: unknown): LetterFieldErrors | undefined {
  if (!isRecord(details)) {
    return undefined;
  }

  const errors: LetterFieldErrors = {};

  if (typeof details.subject === 'string') {
    errors.subject = details.subject;
  }

  if (typeof details.body === 'string') {
    errors.body = details.body;
  }

  return Object.keys(errors).length > 0 ? errors : undefined;
}

function readErrorMessage(payload: unknown): string | undefined {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return undefined;
  }

  return typeof payload.error.message === 'string'
    ? payload.error.message.trim() || undefined
    : undefined;
}

export async function submitFirstLetter(
  input: FirstLetterInput,
): Promise<FirstLetterSubmitResult> {
  const response = await fetch('/api/v1/penpal-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      receiver_id: input.receiverId,
      subject: input.subject,
      body: input.body,
    }),
  });

  if (response.ok) {
    return { ok: true };
  }

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    // The fallback message below keeps non-JSON failures user-facing.
  }

  const details =
    isRecord(payload) && isRecord(payload.error)
      ? payload.error.details
      : undefined;
  const errors = readFieldErrors(details);

  return {
    ok: false,
    errors,
    formError: errors
      ? undefined
      : readErrorMessage(payload) ?? '暂时无法寄出这封信，请稍后重试。',
  };
}
