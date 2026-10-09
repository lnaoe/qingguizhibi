import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { NotificationListView } from '@/features/notifications/NotificationListView';
import {
  getUnreadNotificationCount,
  listNotifications,
} from '@/features/notifications/service';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '通知',
};

const NOTIFICATION_PAGE_LIMIT = 20;

interface NotificationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const user = await getCurrentUser(await headers());

  if (!user) {
    redirect('/login');
  }

  const onboarding = getOnboardingSnapshot(db, user.id);

  if (!onboarding.onboardingCompleted) {
    redirect('/onboarding');
  }

  const params = await searchParams;
  const unreadOnly = params.unread === '1';
  const page = listNotifications(db, user.id, {
    unreadOnly,
    limit: NOTIFICATION_PAGE_LIMIT,
    cursor: null,
  });
  const unreadCount = getUnreadNotificationCount(db, user.id);

  return (
    <NotificationListView
      key={unreadOnly ? 'unread' : 'all'}
      initialPage={page}
      unreadOnly={unreadOnly}
      initialUnreadCount={unreadCount}
    />
  );
}
