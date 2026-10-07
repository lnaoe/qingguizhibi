import { and, desc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import { letters, profiles } from '../../db/schema';
import { discoverPenpals } from '../discovery/service';
import type { HomeRecentLetter, HomeSnapshot } from './types';

const HOME_ENCOUNTER_LIMIT = 3;
const HOME_LETTER_LIMIT = 3;
const MAX_LETTER_LIMIT = 10;

export function getRecentInboxLetters(
  database: AppDatabase,
  currentUserId: string,
  limit = HOME_LETTER_LIMIT,
): HomeRecentLetter[] {
  const safeLimit = Math.min(
    Math.max(Math.trunc(limit), 1),
    MAX_LETTER_LIMIT,
  );

  const rows = database
    .select({
      id: letters.id,
      senderId: letters.senderId,
      senderNickname: profiles.nickname,
      senderAvatarUrl: profiles.avatarUrl,
      subject: letters.subject,
      sentAt: letters.sentAt,
      createdAt: letters.createdAt,
      readAt: letters.readAt,
    })
    .from(letters)
    .leftJoin(profiles, eq(profiles.userId, letters.senderId))
    .where(
      and(
        eq(letters.recipientId, currentUserId),
        eq(letters.status, 'sent'),
      ),
    )
    .orderBy(
      desc(letters.sentAt),
      desc(letters.createdAt),
      desc(letters.id),
    )
    .limit(safeLimit)
    .all();

  return rows.map((row) => ({
    id: row.id,
    senderId: row.senderId,
    senderNickname: row.senderNickname ?? '一位笔友',
    senderAvatarUrl: row.senderAvatarUrl,
    subject: row.subject,
    sentAt: (row.sentAt ?? row.createdAt).toISOString(),
    isUnread: row.readAt === null,
  }));
}

export function getHomeSnapshot(
  database: AppDatabase,
  currentUserId: string,
): HomeSnapshot {
  return {
    todayEncounters: discoverPenpals(database, currentUserId, {
      limit: HOME_ENCOUNTER_LIMIT,
      cursor: null,
      ageRange: null,
      language: null,
      country: null,
      city: null,
      interestIds: [],
      recommend: true,
    }).items,
    recentLetters: getRecentInboxLetters(database, currentUserId),
  };
}
