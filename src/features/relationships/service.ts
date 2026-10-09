import {
  and,
  desc,
  eq,
  inArray,
  lt,
  or,
  type SQL,
} from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import {
  letters,
  penpalRelationships,
  penpalRequests,
  profiles,
} from '../../db/schema';
import {
  encodeRelationshipCursor,
  encodeRelationshipLetterCursor,
} from './query';
import type {
  RelationshipCriteria,
  RelationshipLetter,
  RelationshipLettersCriteria,
  RelationshipLettersPage,
  RelationshipPage,
  RelationshipPeer,
  RelationshipSummary,
  EndRelationshipResult,
} from './types';

function getPeerProfiles(
  database: AppDatabase,
  peerIds: string[],
): Map<string, RelationshipPeer> {
  const profileById = new Map<string, RelationshipPeer>();

  if (peerIds.length === 0) {
    return profileById;
  }

  const profileRows = database
    .select({
      id: profiles.userId,
      nickname: profiles.nickname,
      avatarUrl: profiles.avatarUrl,
      country: profiles.country,
      city: profiles.city,
      ageRange: profiles.ageRange,
    })
    .from(profiles)
    .where(inArray(profiles.userId, peerIds))
    .all();

  for (const profile of profileRows) {
    profileById.set(profile.id, {
      id: profile.id,
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl,
      country: profile.country ?? '',
      city: profile.city ?? '',
      ageRange: profile.ageRange ?? '',
    });
  }

  return profileById;
}

function getPlaceholderPeer(peerId: string): RelationshipPeer {
  return {
    id: peerId,
    nickname: '一位笔友',
    avatarUrl: null,
    country: '',
    city: '',
    ageRange: '',
  };
}

export function listRelationships(
  database: AppDatabase,
  currentUserId: string,
  criteria: RelationshipCriteria,
): RelationshipPage {
  const conditions: SQL[] = [
    or(
      eq(penpalRelationships.userLowId, currentUserId),
      eq(penpalRelationships.userHighId, currentUserId),
    )!,
  ];

  if (criteria.status) {
    conditions.push(eq(penpalRelationships.status, criteria.status));
  }

  if (criteria.cursor) {
    const cursorStartedAt = new Date(criteria.cursor.startedAt);

    conditions.push(
      or(
        lt(penpalRelationships.startedAt, cursorStartedAt),
        and(
          eq(penpalRelationships.startedAt, cursorStartedAt),
          lt(penpalRelationships.id, criteria.cursor.id),
        ),
      )!,
    );
  }

  const rows = database
    .select({
      id: penpalRelationships.id,
      userLowId: penpalRelationships.userLowId,
      userHighId: penpalRelationships.userHighId,
      status: penpalRelationships.status,
      startedAt: penpalRelationships.startedAt,
      endedAt: penpalRelationships.endedAt,
      lastLetterAt: penpalRelationships.lastLetterAt,
    })
    .from(penpalRelationships)
    .where(and(...conditions))
    .orderBy(
      desc(penpalRelationships.startedAt),
      desc(penpalRelationships.id),
    )
    .limit(criteria.limit + 1)
    .all();

  const hasMore = rows.length > criteria.limit;
  const pageRows = rows.slice(0, criteria.limit);
  const peerIds = pageRows.map((row) =>
    row.userLowId === currentUserId ? row.userHighId : row.userLowId,
  );

  const profileById = getPeerProfiles(database, peerIds);

  const items: RelationshipSummary[] = pageRows.map((row) => {
    const peerId =
      row.userLowId === currentUserId ? row.userHighId : row.userLowId;

    return {
      id: row.id,
      status: row.status,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt?.toISOString() ?? null,
      lastLetterAt: row.lastLetterAt?.toISOString() ?? null,
      peer: profileById.get(peerId) ?? getPlaceholderPeer(peerId),
    };
  });

  const lastRow = pageRows.at(-1);
  const nextCursor =
    hasMore && lastRow
      ? encodeRelationshipCursor({
          type: 'started_at',
          startedAt: lastRow.startedAt.toISOString(),
          id: lastRow.id,
        })
      : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export function getRelationshipDetail(
  database: AppDatabase,
  currentUserId: string,
  relationshipId: string,
): RelationshipSummary | null {
  const row = database
    .select({
      id: penpalRelationships.id,
      userLowId: penpalRelationships.userLowId,
      userHighId: penpalRelationships.userHighId,
      status: penpalRelationships.status,
      startedAt: penpalRelationships.startedAt,
      endedAt: penpalRelationships.endedAt,
      lastLetterAt: penpalRelationships.lastLetterAt,
    })
    .from(penpalRelationships)
    .where(
      and(
        eq(penpalRelationships.id, relationshipId),
        or(
          eq(penpalRelationships.userLowId, currentUserId),
          eq(penpalRelationships.userHighId, currentUserId),
        )!,
      ),
    )
    .get();

  if (!row) {
    return null;
  }

  const peerId =
    row.userLowId === currentUserId ? row.userHighId : row.userLowId;
  const profileById = getPeerProfiles(database, [peerId]);

  return {
    id: row.id,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    lastLetterAt: row.lastLetterAt?.toISOString() ?? null,
    peer: profileById.get(peerId) ?? getPlaceholderPeer(peerId),
  };
}

export function endRelationship(
  database: AppDatabase,
  currentUserId: string,
  relationshipId: string,
): EndRelationshipResult {
  const outcome = database.transaction(
    (
      transaction,
    ):
      | { ok: true; alreadyEnded: boolean }
      | {
          ok: false;
          code: 'relationship_not_found' | 'forbidden';
          message: string;
        } => {
      const relationship = transaction
        .select({
          id: penpalRelationships.id,
          userLowId: penpalRelationships.userLowId,
          userHighId: penpalRelationships.userHighId,
          status: penpalRelationships.status,
        })
        .from(penpalRelationships)
        .where(eq(penpalRelationships.id, relationshipId))
        .get();

      if (!relationship) {
        return {
          ok: false,
          code: 'relationship_not_found',
          message: '找不到这段通信关系',
        };
      }

      if (
        relationship.userLowId !== currentUserId &&
        relationship.userHighId !== currentUserId
      ) {
        return {
          ok: false,
          code: 'forbidden',
          message: '只有参与者可以结束这段通信',
        };
      }

      if (relationship.status === 'ended') {
        return { ok: true, alreadyEnded: true };
      }

      const now = new Date();

      transaction
        .update(penpalRelationships)
        .set({
          status: 'ended',
          endedAt: now,
          updatedAt: now,
        })
        .where(eq(penpalRelationships.id, relationship.id))
        .run();

      return { ok: true, alreadyEnded: false };
    },
  );

  if (!outcome.ok) {
    return outcome;
  }

  const relationship = getRelationshipDetail(
    database,
    currentUserId,
    relationshipId,
  );

  if (!relationship) {
    return {
      ok: false,
      code: 'relationship_not_found',
      message: '找不到这段通信关系',
    };
  }

  return {
    ok: true,
    relationship,
    alreadyEnded: outcome.alreadyEnded,
  };
}

export function listRelationshipLetters(
  database: AppDatabase,
  currentUserId: string,
  relationshipId: string,
  criteria: RelationshipLettersCriteria,
): RelationshipLettersPage | null {
  const relationship = database
    .select({
      id: penpalRelationships.id,
      userLowId: penpalRelationships.userLowId,
      userHighId: penpalRelationships.userHighId,
      startedAt: penpalRelationships.startedAt,
    })
    .from(penpalRelationships)
    .where(
      and(
        eq(penpalRelationships.id, relationshipId),
        or(
          eq(penpalRelationships.userLowId, currentUserId),
          eq(penpalRelationships.userHighId, currentUserId),
        )!,
      ),
    )
    .get();

  if (!relationship) {
    return null;
  }

  // The first letter is created before the relationship exists and stores a
  // null relationship_id, so it is matched back through the accepted request
  // that started this relationship (same accept timestamp).
  const initialLetter = database
    .select({ id: penpalRequests.initialLetterId })
    .from(penpalRequests)
    .where(
      and(
        eq(penpalRequests.status, 'accepted'),
        eq(penpalRequests.respondedAt, relationship.startedAt),
        or(
          and(
            eq(penpalRequests.senderId, relationship.userLowId),
            eq(penpalRequests.receiverId, relationship.userHighId),
          ),
          and(
            eq(penpalRequests.senderId, relationship.userHighId),
            eq(penpalRequests.receiverId, relationship.userLowId),
          ),
        )!,
      ),
    )
    .get();

  const letterScope = initialLetter?.id
    ? or(
        eq(letters.relationshipId, relationshipId),
        eq(letters.id, initialLetter.id),
      )!
    : eq(letters.relationshipId, relationshipId);
  const participantScope = or(
    and(
      eq(letters.senderId, relationship.userLowId),
      eq(letters.recipientId, relationship.userHighId),
    ),
    and(
      eq(letters.senderId, relationship.userHighId),
      eq(letters.recipientId, relationship.userLowId),
    ),
  )!;

  const conditions: SQL[] = [
    letterScope,
    participantScope,
    eq(letters.status, 'sent'),
  ];

  if (criteria.cursor) {
    const cursorSentAt = new Date(criteria.cursor.sentAt);

    conditions.push(
      or(
        lt(letters.sentAt, cursorSentAt),
        and(
          eq(letters.sentAt, cursorSentAt),
          lt(letters.id, criteria.cursor.id),
        ),
      )!,
    );
  }

  const rows = database
    .select({
      id: letters.id,
      senderId: letters.senderId,
      recipientId: letters.recipientId,
      subject: letters.subject,
      sentAt: letters.sentAt,
      createdAt: letters.createdAt,
      readAt: letters.readAt,
    })
    .from(letters)
    .where(and(...conditions))
    .orderBy(desc(letters.sentAt), desc(letters.id))
    .limit(criteria.limit + 1)
    .all();

  const hasMore = rows.length > criteria.limit;
  const pageRows = rows.slice(0, criteria.limit);

  const items: RelationshipLetter[] = pageRows.map((row) => ({
    id: row.id,
    senderId: row.senderId,
    recipientId: row.recipientId,
    subject: row.subject,
    sentAt: (row.sentAt ?? row.createdAt).toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    isMine: row.senderId === currentUserId,
  }));

  const lastRow = pageRows.at(-1);
  const nextCursor =
    hasMore && lastRow
      ? encodeRelationshipLetterCursor({
          type: 'sent_at',
          sentAt: (lastRow.sentAt ?? lastRow.createdAt).toISOString(),
          id: lastRow.id,
        })
      : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}
