import { and, eq, isNull, or } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import {
  letters,
  penpalRelationships,
  profiles,
} from '../../db/schema';
import type {
  GetLetterDetailResult,
  LetterDetailRecord,
  LetterParticipantSummary,
  MarkLetterReadResult,
} from './types';

type LetterRow = typeof letters.$inferSelect;

function getParticipantSummary(
  database: AppDatabase,
  userId: string,
): LetterParticipantSummary {
  const profile = database
    .select({
      nickname: profiles.nickname,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .get();

  return {
    id: userId,
    nickname: profile?.nickname ?? '一位笔友',
    avatarUrl: profile?.avatarUrl ?? null,
  };
}

function findReplyRelationshipId(
  database: AppDatabase,
  letter: LetterRow,
): string | null {
  const pairCondition = or(
    and(
      eq(penpalRelationships.userLowId, letter.senderId),
      eq(penpalRelationships.userHighId, letter.recipientId),
    ),
    and(
      eq(penpalRelationships.userLowId, letter.recipientId),
      eq(penpalRelationships.userHighId, letter.senderId),
    ),
  );

  if (letter.relationshipId) {
    const relationship = database
      .select({ id: penpalRelationships.id })
      .from(penpalRelationships)
      .where(
        and(
          eq(penpalRelationships.id, letter.relationshipId),
          eq(penpalRelationships.status, 'active'),
          pairCondition,
        ),
      )
      .get();

    return relationship?.id ?? null;
  }

  const relationship = database
    .select({ id: penpalRelationships.id })
    .from(penpalRelationships)
    .where(
      and(
        eq(penpalRelationships.status, 'active'),
        pairCondition,
      ),
    )
    .get();

  return relationship?.id ?? null;
}

function toLetterDetail(
  database: AppDatabase,
  letter: LetterRow,
): LetterDetailRecord {
  return {
    id: letter.id,
    relationshipId: letter.relationshipId,
    sender: getParticipantSummary(database, letter.senderId),
    recipient: getParticipantSummary(database, letter.recipientId),
    subject: letter.subject,
    body: letter.body,
    status: letter.status,
    sentAt: letter.sentAt,
    readAt: letter.readAt,
    createdAt: letter.createdAt,
    updatedAt: letter.updatedAt,
    replyRelationshipId: findReplyRelationshipId(database, letter),
  };
}

function findReadableLetter(
  database: AppDatabase,
  currentUserId: string,
  letterId: string,
): LetterRow | undefined {
  return database
    .select()
    .from(letters)
    .where(
      and(
        eq(letters.id, letterId),
        eq(letters.status, 'sent'),
        or(
          eq(letters.senderId, currentUserId),
          eq(letters.recipientId, currentUserId),
        ),
      ),
    )
    .get();
}

export function getLetterDetail(
  database: AppDatabase,
  currentUserId: string,
  letterId: string,
): GetLetterDetailResult {
  const letter = findReadableLetter(database, currentUserId, letterId);

  if (!letter) {
    return {
      ok: false,
      code: 'letter_not_found',
      message: '找不到这封信',
    };
  }

  return {
    ok: true,
    letter: toLetterDetail(database, letter),
  };
}

export function markLetterRead(
  database: AppDatabase,
  currentUserId: string,
  letterId: string,
): MarkLetterReadResult {
  const letter = findReadableLetter(database, currentUserId, letterId);

  if (!letter) {
    return {
      ok: false,
      code: 'letter_not_found',
      message: '找不到这封信',
    };
  }

  if (letter.recipientId !== currentUserId) {
    return {
      ok: false,
      code: 'forbidden',
      message: '只有收信人可以标记这封信为已读',
    };
  }

  if (letter.readAt !== null) {
    return {
      ok: true,
      letter: toLetterDetail(database, letter),
      alreadyRead: true,
    };
  }

  const now = new Date();

  database
    .update(letters)
    .set({ readAt: now })
    .where(
      and(
        eq(letters.id, letter.id),
        eq(letters.recipientId, currentUserId),
        isNull(letters.readAt),
      ),
    )
    .run();

  const updatedLetter = findReadableLetter(
    database,
    currentUserId,
    letterId,
  );

  if (!updatedLetter) {
    return {
      ok: false,
      code: 'letter_not_found',
      message: '找不到这封信',
    };
  }

  return {
    ok: true,
    letter: toLetterDetail(database, updatedLetter),
    alreadyRead: false,
  };
}
