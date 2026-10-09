import type {
  LetterDraftFieldErrors,
  LetterDraftValues,
} from './types';

interface SaveReplyDraftInput extends LetterDraftValues {
  relationshipId: string;
  draftId?: string | null;
}

export type SaveReplyDraftResult =
  | { ok: true; draftId: string }
  | {
      ok: false;
      errors?: LetterDraftFieldErrors;
      formError?: string;
    };

export type SendReplyDraftResult =
  | { ok: true; letterId: string; alreadySent: boolean }
  | {
      ok: false;
      errors?: LetterDraftFieldErrors;
      formError?: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFieldErrors(details: unknown): LetterDraftFieldErrors | undefined {
  if (!isRecord(details)) {
    return undefined;
  }

  const errors: LetterDraftFieldErrors = {};

  for (const field of [
    'subject',
    'body',
    'relationship_id',
    'request',
  ] as const) {
    if (typeof details[field] === 'string') {
      errors[field] = details[field];
    }
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

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readDataLetterId(payload: unknown): string | undefined {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return undefined;
  }

  return typeof payload.data.id === 'string' && payload.data.id
    ? payload.data.id
    : undefined;
}

function readSendResult(
  payload: unknown,
): { letterId: string; alreadySent: boolean } | undefined {
  if (
    !isRecord(payload) ||
    !isRecord(payload.data) ||
    !isRecord(payload.data.letter)
  ) {
    return undefined;
  }

  const letterId =
    typeof payload.data.letter.id === 'string'
      ? payload.data.letter.id
      : '';

  if (!letterId) {
    return undefined;
  }

  return {
    letterId,
    alreadySent: payload.data.already_sent === true,
  };
}

function errorResult(
  payload: unknown,
  fallbackMessage: string,
): {
  ok: false;
  errors?: LetterDraftFieldErrors;
  formError?: string;
} {
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
      : readErrorMessage(payload) ?? fallbackMessage,
  };
}

export async function saveReplyDraft(
  input: SaveReplyDraftInput,
): Promise<SaveReplyDraftResult> {
  const draftId = input.draftId ?? null;
  const url = draftId
    ? `/api/v1/letters/${encodeURIComponent(draftId)}`
    : '/api/v1/letters';
  const response = await fetch(url, {
    method: draftId ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify(
      draftId
        ? {
            subject: input.subject,
            body: input.body,
          }
        : {
            relationship_id: input.relationshipId,
            subject: input.subject,
            body: input.body,
          },
    ),
  });
  const payload = await readJson(response);

  if (response.ok) {
    const savedDraftId = readDataLetterId(payload);

    if (savedDraftId) {
      return { ok: true, draftId: savedDraftId };
    }

    return {
      ok: false,
      formError: '暂时无法保存草稿，请稍后重试。',
    };
  }

  return errorResult(
    payload,
    '暂时无法保存草稿，请稍后重试。',
  );
}

export async function sendReplyDraft(
  draftId: string,
): Promise<SendReplyDraftResult> {
  const response = await fetch(
    `/api/v1/letters/${encodeURIComponent(draftId)}/send`,
    {
      method: 'POST',
      credentials: 'same-origin',
    },
  );
  const payload = await readJson(response);

  if (response.ok) {
    const result = readSendResult(payload);

    if (result) {
      return {
        ok: true,
        letterId: result.letterId,
        alreadySent: result.alreadySent,
      };
    }

    return {
      ok: false,
      formError: '暂时无法寄出这封信，请稍后重试。',
    };
  }

  return errorResult(
    payload,
    '暂时无法寄出这封信，请稍后重试。',
  );
}
