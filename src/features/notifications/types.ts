import type { notificationTypeValues } from '../../db/schema';

export type NotificationType = (typeof notificationTypeValues)[number];

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  referenceType: string | null;
  referenceId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationCursor {
  createdAt: string;
  id: string;
}

export interface NotificationCriteria {
  unreadOnly: boolean;
  limit: number;
  cursor: NotificationCursor | null;
}

export interface NotificationPage {
  items: NotificationItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type ParseNotificationQueryResult =
  | { ok: true; criteria: NotificationCriteria }
  | { ok: false; errors: Record<string, string> };

export type MarkNotificationReadResult =
  | { ok: true; notification: NotificationItem; alreadyRead: boolean }
  | { ok: false; code: 'not_found'; message: string };

export interface MarkAllNotificationsReadResult {
  updatedCount: number;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt?: Date;
}
