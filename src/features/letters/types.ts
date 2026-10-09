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

export interface CreateLetterDraftInput extends LetterDraftValues {
  relationshipId: string;
}

export type LetterDraftFieldErrors = LetterFieldErrors & {
  relationship_id?: string;
  request?: string;
};

export type CreateLetterDraftValidationResult =
  | { ok: true; values: CreateLetterDraftInput }
  | { ok: false; errors: LetterDraftFieldErrors };

export type UpdateLetterDraftInput = Partial<LetterDraftValues>;

export type UpdateLetterDraftValidationResult =
  | { ok: true; values: UpdateLetterDraftInput }
  | { ok: false; errors: LetterDraftFieldErrors };

export interface LetterDraftRecord {
  id: string;
  relationshipId: string;
  senderId: string;
  recipientId: string;
  subject: string | null;
  body: string;
  status: 'draft';
  sentAt: null;
  readAt: null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateLetterDraftResult =
  | { ok: true; letter: LetterDraftRecord }
  | {
      ok: false;
      code: 'validation_error' | 'relationship_not_found';
      message: string;
      errors?: LetterDraftFieldErrors;
    };

export type UpdateLetterDraftResult =
  | { ok: true; letter: LetterDraftRecord }
  | {
      ok: false;
      code: 'validation_error' | 'draft_not_found';
      message: string;
      errors?: LetterDraftFieldErrors;
    };

export interface EditableLetterDraftRecord {
  id: string;
  relationshipId: string;
  recipient: LetterParticipantSummary;
  subject: string | null;
  body: string;
  updatedAt: Date;
}

export type GetDraftForEditingResult =
  | { ok: true; draft: EditableLetterDraftRecord }
  | {
      ok: false;
      code: 'draft_not_found';
      message: string;
    };

export interface SentLetterRecord {
  id: string;
  relationshipId: string;
  senderId: string;
  recipientId: string;
  subject: string | null;
  body: string;
  status: 'sent';
  sentAt: Date;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SendLetterFailureCode =
  | 'validation_error'
  | 'letter_not_found'
  | 'forbidden'
  | 'relationship_not_active'
  | 'blocked';

export type SendLetterResult =
  | { ok: true; letter: SentLetterRecord; alreadySent: boolean }
  | {
      ok: false;
      code: SendLetterFailureCode;
      message: string;
      errors?: LetterFieldErrors;
    };

export interface LetterParticipantSummary {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface LetterDetailRecord {
  id: string;
  relationshipId: string | null;
  sender: LetterParticipantSummary;
  recipient: LetterParticipantSummary;
  subject: string | null;
  body: string;
  status: 'draft' | 'sent';
  sentAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  replyRelationshipId: string | null;
}

export type GetLetterDetailResult =
  | { ok: true; letter: LetterDetailRecord }
  | {
      ok: false;
      code: 'letter_not_found';
      message: string;
    };

export type MarkLetterReadResult =
  | {
      ok: true;
      letter: LetterDetailRecord;
      alreadyRead: boolean;
    }
  | {
      ok: false;
      code: 'letter_not_found' | 'forbidden';
      message: string;
    };
