import { randomUUID } from 'node:crypto';
import { and, eq, or } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import {
  blocks,
  letters,
  penpalRelationships,
  penpalRequests,
  profiles,
  users,
} from '../../db/schema';
import { createNotification } from '../notifications/service';
import { validateCreateFirstContact } from './validation';
import type { CreateFirstContactResult } from './types';

function isPendingRequestUniqueError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /penpal_requests_pending_unique_idx|penpal_requests\.(sender_id|receiver_id)/i.test(
    error.message,
  );
}

export function createFirstContact(
  database: AppDatabase,
  senderId: string,
  input: unknown,
): CreateFirstContactResult {
  const validation = validateCreateFirstContact(input);

  if (!validation.ok) {
    return {
      ok: false,
      code: 'validation_error',
      message: '请求参数无效',
      errors: validation.errors,
    };
  }

  const { receiverId, subject, body } = validation.values;

  if (receiverId === senderId) {
    return {
      ok: false,
      code: 'self_request',
      message: '不能给自己写信',
    };
  }

  try {
    return database.transaction((transaction): CreateFirstContactResult => {
      const sender = transaction
        .select({ nickname: profiles.nickname })
        .from(profiles)
        .innerJoin(users, eq(users.id, profiles.userId))
        .where(
          and(
            eq(profiles.userId, senderId),
            eq(profiles.onboardingCompleted, true),
            eq(users.status, 'active'),
          ),
        )
        .get();

      if (!sender) {
        return {
          ok: false,
          code: 'sender_not_ready',
          message: '请先完成个人资料',
        };
      }

      const receiver = transaction
        .select({ id: profiles.userId })
        .from(profiles)
        .innerJoin(users, eq(users.id, profiles.userId))
        .where(
          and(
            eq(profiles.userId, receiverId),
            eq(profiles.visibility, 'public'),
            eq(profiles.onboardingCompleted, true),
            eq(users.status, 'active'),
          ),
        )
        .get();

      if (!receiver) {
        return {
          ok: false,
          code: 'receiver_not_found',
          message: '找不到这位笔友',
        };
      }

      const block = transaction
        .select({ id: blocks.id })
        .from(blocks)
        .where(
          or(
            and(
              eq(blocks.blockerId, senderId),
              eq(blocks.blockedId, receiverId),
            ),
            and(
              eq(blocks.blockerId, receiverId),
              eq(blocks.blockedId, senderId),
            ),
          ),
        )
        .get();

      if (block) {
        return {
          ok: false,
          code: 'blocked',
          message: '暂时无法向这位笔友寄信',
        };
      }

      const activeRelationship = transaction
        .select({ id: penpalRelationships.id })
        .from(penpalRelationships)
        .where(
          and(
            eq(penpalRelationships.status, 'active'),
            or(
              and(
                eq(penpalRelationships.userLowId, senderId),
                eq(penpalRelationships.userHighId, receiverId),
              ),
              and(
                eq(penpalRelationships.userLowId, receiverId),
                eq(penpalRelationships.userHighId, senderId),
              ),
            ),
          ),
        )
        .get();

      if (activeRelationship) {
        return {
          ok: false,
          code: 'active_relationship',
          message: '你们已经是笔友了',
        };
      }

      const pendingRequest = transaction
        .select({ id: penpalRequests.id })
        .from(penpalRequests)
        .where(
          and(
            eq(penpalRequests.senderId, senderId),
            eq(penpalRequests.receiverId, receiverId),
            eq(penpalRequests.status, 'pending'),
          ),
        )
        .get();

      if (pendingRequest) {
        return {
          ok: false,
          code: 'duplicate_request',
          message: '已经有一封等待回应的信了',
        };
      }

      const now = new Date();
      const letterId = randomUUID();
      const requestId = randomUUID();
      const letter = {
        id: letterId,
        relationshipId: null,
        senderId,
        recipientId: receiverId,
        subject,
        body,
        status: 'sent' as const,
        sentAt: now,
        readAt: null,
        createdAt: now,
        updatedAt: now,
      };
      const request = {
        id: requestId,
        senderId,
        receiverId,
        initialLetterId: letterId,
        status: 'pending' as const,
        createdAt: now,
        respondedAt: null,
      };

      transaction.insert(letters).values(letter).run();
      transaction.insert(penpalRequests).values(request).run();
      createNotification(transaction, {
        userId: receiverId,
        type: 'penpal_request',
        title: `${sender.nickname} 给你寄来了一封信`,
        body: subject,
        referenceType: 'penpal_request',
        referenceId: requestId,
        createdAt: now,
      });

      return {
        ok: true,
        request,
        letter,
      };
    });
  } catch (error) {
    if (isPendingRequestUniqueError(error)) {
      return {
        ok: false,
        code: 'duplicate_request',
        message: '已经有一封等待回应的信了',
      };
    }

    throw error;
  }
}
