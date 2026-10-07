import type { LetterDraftValues, LetterFieldErrors } from '../letters/types';

export interface CreateFirstContactInput extends LetterDraftValues {
  receiverId: string;
}

export type CreateFirstContactFieldErrors = LetterFieldErrors & {
  receiver_id?: string;
};

export type CreateFirstContactValidationResult =
  | { ok: true; values: CreateFirstContactInput }
  | { ok: false; errors: CreateFirstContactFieldErrors };

export interface CreatedPenpalRequest {
  id: string;
  senderId: string;
  receiverId: string;
  initialLetterId: string;
  status: 'pending';
  createdAt: Date;
  respondedAt: null;
}

export interface CreatedInitialLetter {
  id: string;
  relationshipId: null;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  status: 'sent';
  sentAt: Date;
  readAt: null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateFirstContactFailureCode =
  | 'validation_error'
  | 'sender_not_ready'
  | 'receiver_not_found'
  | 'self_request'
  | 'blocked'
  | 'active_relationship'
  | 'duplicate_request';

export type CreateFirstContactResult =
  | {
      ok: true;
      request: CreatedPenpalRequest;
      letter: CreatedInitialLetter;
    }
  | {
      ok: false;
      code: CreateFirstContactFailureCode;
      message: string;
      errors?: CreateFirstContactFieldErrors;
    };

export type PenpalRequestStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled';

export interface PenpalRequestRecord {
  id: string;
  senderId: string;
  receiverId: string;
  initialLetterId: string | null;
  status: PenpalRequestStatus;
  createdAt: Date;
  respondedAt: Date | null;
}

export interface PenpalRelationshipRecord {
  id: string;
  userLowId: string;
  userHighId: string;
  status: 'active' | 'ended';
  startedAt: Date;
  endedAt: Date | null;
  lastLetterAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RespondToRequestFailureCode =
  | 'request_not_found'
  | 'forbidden'
  | 'blocked'
  | 'request_not_pending';

export type AcceptPenpalRequestResult =
  | {
      ok: true;
      request: PenpalRequestRecord;
      relationship: PenpalRelationshipRecord;
      alreadyAccepted: boolean;
    }
  | {
      ok: false;
      code: RespondToRequestFailureCode;
      message: string;
    };

export type RejectPenpalRequestResult =
  | {
      ok: true;
      request: PenpalRequestRecord;
      alreadyRejected: boolean;
    }
  | {
      ok: false;
      code: RespondToRequestFailureCode;
      message: string;
    };
