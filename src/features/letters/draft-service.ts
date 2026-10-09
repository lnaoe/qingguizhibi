import { randomUUID } from 'node:crypto';
import { and, eq, or } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import {
  letters,
  penpalRelationships,
  profiles,
} from '../../db/schema';
import type {
  CreateLetterDraftResult,
  GetDraftForEditingResult,
  LetterDraftRecord,
  UpdateLetterDraftResult,
} from './types';
import {
  validateCreateLetterDraft,
  validateUpdateLetterDraft,
} from './validation';

export function createLetterDraft(
  database: AppDatabase,
  currentUserId: string,
  input: unknown,
): CreateLetterDraftResult {
  const validation = validateCreateLetterDraft(input);

  if (!validation.ok) {
    return {
      ok: false,
      code: 'validation_error',
      message: '请求参数无效',
      errors: validation.errors,
    };
  }

  const { relationshipId, subject, body } = validation.values;

  return database.transaction((transaction): CreateLetterDraftResult => {
    const relationship = transaction
      .select({
        id: penpalRelationships.id,
        userLowId: penpalRelationships.userLowId,
        userHighId: penpalRelationships.userHighId,
      })
      .from(penpalRelationships)
      .where(
        and(
          eq(penpalRelationships.id, relationshipId),
          eq(penpalRelationships.status, 'active'),
          or(
            eq(penpalRelationships.userLowId, currentUserId),
            eq(penpalRelationships.userHighId, currentUserId),
          ),
        ),
      )
      .get();

    if (!relationship) {
      return {
        ok: false,
        code: 'relationship_not_found',
        message: '找不到可以写信的笔友',
      };
    }

    const recipientId =
      relationship.userLowId === currentUserId
        ? relationship.userHighId
        : relationship.userLowId;
    const now = new Date();
    const letter: LetterDraftRecord = {
      id: randomUUID(),
      relationshipId: relationship.id,
      senderId: currentUserId,
      recipientId,
      subject,
      body,
      status: 'draft',
      sentAt: null,
      readAt: null,
      createdAt: now,
      updatedAt: now,
    };

    transaction.insert(letters).values(letter).run();

    return { ok: true, letter };
  });
}

export function updateLetterDraft(
  database: AppDatabase,
  currentUserId: string,
  letterId: string,
  input: unknown,
): UpdateLetterDraftResult {
  const validation = validateUpdateLetterDraft(input);

  if (!validation.ok) {
    return {
      ok: false,
      code: 'validation_error',
      message: '请求参数无效',
      errors: validation.errors,
    };
  }

  return database.transaction((transaction): UpdateLetterDraftResult => {
    const draft = transaction
      .select()
      .from(letters)
      .where(
        and(
          eq(letters.id, letterId),
          eq(letters.senderId, currentUserId),
          eq(letters.status, 'draft'),
        ),
      )
      .get();

    if (!draft) {
      return {
        ok: false,
        code: 'draft_not_found',
        message: '找不到这封草稿',
      };
    }

    const updatedAt = new Date();

    transaction
      .update(letters)
      .set({
        ...validation.values,
        updatedAt,
      })
      .where(eq(letters.id, draft.id))
      .run();

    return {
      ok: true,
      letter: {
        id: draft.id,
        relationshipId: draft.relationshipId ?? '',
        senderId: draft.senderId,
        recipientId: draft.recipientId,
        subject: validation.values.subject ?? draft.subject,
        body: validation.values.body ?? draft.body,
        status: 'draft',
        sentAt: null,
        readAt: null,
        createdAt: draft.createdAt,
        updatedAt,
      },
    };
  });
}

export function getDraftForEditing(
  database: AppDatabase,
  currentUserId: string,
  letterId: string,
): GetDraftForEditingResult {
  const draft = database
    .select({
      id: letters.id,
      relationshipId: letters.relationshipId,
      recipientId: letters.recipientId,
      recipientNickname: profiles.nickname,
      recipientAvatarUrl: profiles.avatarUrl,
      subject: letters.subject,
      body: letters.body,
      updatedAt: letters.updatedAt,
    })
    .from(letters)
    .leftJoin(profiles, eq(profiles.userId, letters.recipientId))
    .where(
      and(
        eq(letters.id, letterId),
        eq(letters.status, 'draft'),
        eq(letters.senderId, currentUserId),
      ),
    )
    .get();

  if (!draft) {
    return {
      ok: false,
      code: 'draft_not_found',
      message: '找不到这封草稿',
    };
  }

  return {
    ok: true,
    draft: {
      id: draft.id,
      relationshipId: draft.relationshipId ?? '',
      recipient: {
        id: draft.recipientId,
        nickname: draft.recipientNickname ?? '一位笔友',
        avatarUrl: draft.recipientAvatarUrl,
      },
      subject: draft.subject,
      body: draft.body,
      updatedAt: draft.updatedAt,
    },
  };
}
