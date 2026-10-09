import { randomUUID } from 'node:crypto';
import { and, eq, or } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import {
  blocks,
  letters,
  notifications,
  penpalRelationships,
  profiles,
} from '../../db/schema';
import type {
  SendLetterResult,
  SentLetterRecord,
} from './types';

type LetterRow = typeof letters.$inferSelect;

function toSentLetter(letter: LetterRow): SentLetterRecord {
  return {
    id: letter.id,
    relationshipId: letter.relationshipId ?? '',
    senderId: letter.senderId,
    recipientId: letter.recipientId,
    subject: letter.subject,
    body: letter.body,
    status: 'sent',
    sentAt: letter.sentAt ?? letter.updatedAt,
    readAt: letter.readAt,
    createdAt: letter.createdAt,
    updatedAt: letter.updatedAt,
  };
}

export function sendLetter(
  database: AppDatabase,
  currentUserId: string,
  letterId: string,
): SendLetterResult {
  return database.transaction((transaction): SendLetterResult => {
    const letter = transaction
      .select()
      .from(letters)
      .where(eq(letters.id, letterId))
      .get();

    if (!letter) {
      return {
        ok: false,
        code: 'letter_not_found',
        message: '找不到这封草稿',
      };
    }

    if (letter.senderId !== currentUserId) {
      return {
        ok: false,
        code: 'forbidden',
        message: '只有寄信人可以寄出这封草稿',
      };
    }

    if (letter.status === 'sent') {
      return {
        ok: true,
        letter: toSentLetter(letter),
        alreadySent: true,
      };
    }

    if (!letter.relationshipId) {
      return {
        ok: false,
        code: 'relationship_not_active',
        message: '这段笔友关系已结束，不能寄信',
      };
    }

    const relationship = transaction
      .select({ id: penpalRelationships.id })
      .from(penpalRelationships)
      .where(
        and(
          eq(penpalRelationships.id, letter.relationshipId),
          eq(penpalRelationships.status, 'active'),
          or(
            and(
              eq(penpalRelationships.userLowId, letter.senderId),
              eq(penpalRelationships.userHighId, letter.recipientId),
            ),
            and(
              eq(penpalRelationships.userLowId, letter.recipientId),
              eq(penpalRelationships.userHighId, letter.senderId),
            ),
          ),
        ),
      )
      .get();

    if (!relationship) {
      return {
        ok: false,
        code: 'relationship_not_active',
        message: '这段笔友关系已结束，不能寄信',
      };
    }

    const block = transaction
      .select({ id: blocks.id })
      .from(blocks)
      .where(
        or(
          and(
            eq(blocks.blockerId, letter.senderId),
            eq(blocks.blockedId, letter.recipientId),
          ),
          and(
            eq(blocks.blockerId, letter.recipientId),
            eq(blocks.blockedId, letter.senderId),
          ),
        ),
      )
      .get();

    if (block) {
      return {
        ok: false,
        code: 'blocked',
        message: '暂时无法给这位笔友寄信',
      };
    }

    const body = letter.body.trim();

    if (!body) {
      return {
        ok: false,
        code: 'validation_error',
        message: '请求参数无效',
        errors: {
          body: '请写下想对这位笔友说的话',
        },
      };
    }

    const now = new Date(Math.floor(Date.now() / 1000) * 1000);
    const sentLetter: LetterRow = {
      ...letter,
      body,
      status: 'sent',
      sentAt: now,
      updatedAt: now,
    };

    transaction
      .update(letters)
      .set({
        body,
        status: 'sent',
        sentAt: now,
        updatedAt: now,
      })
      .where(eq(letters.id, letter.id))
      .run();

    transaction
      .update(penpalRelationships)
      .set({
        lastLetterAt: now,
        updatedAt: now,
      })
      .where(eq(penpalRelationships.id, relationship.id))
      .run();

    const senderProfile = transaction
      .select({ nickname: profiles.nickname })
      .from(profiles)
      .where(eq(profiles.userId, currentUserId))
      .get();

    transaction
      .insert(notifications)
      .values({
        id: randomUUID(),
        userId: letter.recipientId,
        type: 'new_letter',
        title: `${senderProfile?.nickname ?? '一位笔友'} 给你寄来了一封信`,
        body: letter.subject,
        referenceType: 'letter',
        referenceId: letter.id,
        createdAt: now,
      })
      .run();

    return {
      ok: true,
      letter: toSentLetter(sentLetter),
      alreadySent: false,
    };
  });
}
