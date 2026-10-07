export interface LetterDraftValues {
  subject: string;
  body: string;
}

export type LetterFieldErrors = Partial<
  Record<keyof LetterDraftValues, string>
>;

export type LetterValidationResult =
  | { ok: true; values: LetterDraftValues }
  | { ok: false; errors: LetterFieldErrors };
