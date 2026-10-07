import { randomUUID } from 'node:crypto';
import { and, eq, or } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import {
  blocks,
  notifications,
  penpalRelationships,
  penpalRequests,
  profiles,
} from '../../db/schema';
import type {
  AcceptPenpalRequestResult,
  PenpalRelationshipRecord,
  RejectPenpalRequestResult,
} from './types';

function canonicalPair(firstUserId: string, secondUserId: string) {
  return firstUserId < secondUserId
    ? { userLowId: firstUserId, userHighId: secondUserId }
    : { userLowId: secondUserId, userHighId: firstUserId };
}

export function acceptPenpalRequest(
  database: AppDatabase,
  userId: string,
  requestId: string,
): AcceptPenpalRequestResult {
  return database.transaction((transaction): AcceptPenpalRequestResult => {
    const request = transaction
      .select()
      .from(penpalRequests)
      .where(eq(penpalRequests.id, requestId))
      .get();

    if (!request) {
      return {
        ok: false,
        code: 'request_not_found',
        message: '找不到这封来信',
      };
    }

    if (request.receiverId !== userId) {
      return {
        ok: false,
        code: 'forbidden',
        message: '只有收信人可以回应这封信',
      };
    }

    const pair = canonicalPair(request.senderId, request.receiverId);

    const findActiveRelationship = (): PenpalRelationshipRecord | undefined =>
      transaction
        .select()
        .from(penpalRelationships)
        .where(
          and(
            eq(penpalRelationships.userLowId, pair.userLowId),
            eq(penpalRelationships.userHighId, pair.userHighId),
            eq(penpalRelationships.status, 'active'),
          ),
        )
        .get();

    if (request.status === 'accepted') {
      const relationship = findActiveRelationship();

      if (relationship) {
        return {
          ok: true,
          request,
          relationship,
          alreadyAccepted: true,
        };
      }
    }

    if (request.status !== 'pending') {
      return {
        ok: false,
        code: 'request_not_pending',
        message: '这封来信已经回应过了',
      };
    }

    const block = transaction
      .select({ id: blocks.id })
      .from(blocks)
      .where(
        or(
          and(
            eq(blocks.blockerId, request.senderId),
            eq(blocks.blockedId, request.receiverId),
          ),
          and(
            eq(blocks.blockerId, request.receiverId),
            eq(blocks.blockedId, request.senderId),
          ),
        ),
      )
      .get();

    if (block) {
      return {
        ok: false,
        code: 'blocked',
        message: '暂时无法接受这封来信',
      };
    }

    const now = new Date();
    let relationship = findActiveRelationship();

    if (!relationship) {
      const createdRelationship: PenpalRelationshipRecord = {
        id: randomUUID(),
        userLowId: pair.userLowId,
        userHighId: pair.userHighId,
        status: 'active',
        startedAt: now,
        endedAt: null,
        lastLetterAt: null,
        createdAt: now,
        updatedAt: now,
      };

      transaction
        .insert(penpalRelationships)
        .values(createdRelationship)
        .run();
      relationship = createdRelationship;
    }

    transaction
      .update(penpalRequests)
      .set({ status: 'accepted', respondedAt: now })
      .where(eq(penpalRequests.id, request.id))
      .run();

    const receiverProfile = transaction
      .select({ nickname: profiles.nickname })
      .from(profiles)
      .where(eq(profiles.userId, request.receiverId))
      .get();

    transaction
      .insert(notifications)
      .values({
        id: randomUUID(),
        userId: request.senderId,
        type: 'request_accepted',
        title: `${receiverProfile?.nickname ?? '对方'} 接受了你的来信`,
        body: null,
        referenceType: 'penpal_request',
        referenceId: request.id,
        createdAt: now,
      })
      .run();

    return {
      ok: true,
      request: {
        ...request,
        status: 'accepted',
        respondedAt: now,
      },
      relationship,
      alreadyAccepted: false,
    };
  });
}

export function rejectPenpalRequest(
  database: AppDatabase,
  userId: string,
  requestId: string,
): RejectPenpalRequestResult {
  return database.transaction((transaction): RejectPenpalRequestResult => {
    const request = transaction
      .select()
      .from(penpalRequests)
      .where(eq(penpalRequests.id, requestId))
      .get();

    if (!request) {
      return {
        ok: false,
        code: 'request_not_found',
        message: '找不到这封来信',
      };
    }

    if (request.receiverId !== userId) {
      return {
        ok: false,
        code: 'forbidden',
        message: '只有收信人可以回应这封信',
      };
    }

    if (request.status === 'rejected') {
      return { ok: true, request, alreadyRejected: true };
    }

    if (request.status !== 'pending') {
      return {
        ok: false,
        code: 'request_not_pending',
        message: '这封来信已经回应过了',
      };
    }

    const now = new Date();

    transaction
      .update(penpalRequests)
      .set({ status: 'rejected', respondedAt: now })
      .where(eq(penpalRequests.id, request.id))
      .run();

    return {
      ok: true,
      request: {
        ...request,
        status: 'rejected',
        respondedAt: now,
      },
      alreadyRejected: false,
    };
  });
}
