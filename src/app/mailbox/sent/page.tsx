import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { MailboxSentView } from '@/features/mailbox/MailboxSentView';
import {
  createMailboxSearchParams,
  parseMailboxQuery,
} from '@/features/mailbox/query';
import { getSentPage } from '@/features/mailbox/service';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '寄出',
};

interface MailboxSentPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MailboxSentPage({
  searchParams,
}: MailboxSentPageProps) {
  const user = await getCurrentUser(await headers());

  if (!user) {
    redirect('/login');
  }

  const onboarding = getOnboardingSnapshot(db, user.id);

  if (!onboarding.onboardingCompleted) {
    redirect('/onboarding');
  }

  const query = parseMailboxQuery(
    createMailboxSearchParams(await searchParams),
  );

  if (!query.ok) {
    return (
      <MailboxSentView
        criteria={null}
        page={null}
        errorMessage="寄出链接无效，请打开最新寄出。"
      />
    );
  }

  const page = getSentPage(db, user.id, query.criteria);

  return <MailboxSentView criteria={query.criteria} page={page} />;
}
