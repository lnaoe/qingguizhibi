import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { MailboxDraftsView } from '@/features/mailbox/MailboxDraftsView';
import {
  createMailboxSearchParams,
  parseMailboxQuery,
} from '@/features/mailbox/query';
import { getDraftsPage } from '@/features/mailbox/service';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '草稿',
};

interface MailboxDraftsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MailboxDraftsPage({
  searchParams,
}: MailboxDraftsPageProps) {
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
      <MailboxDraftsView
        criteria={null}
        page={null}
        errorMessage="草稿链接无效，请打开最新草稿。"
      />
    );
  }

  const page = getDraftsPage(db, user.id, query.criteria);

  return <MailboxDraftsView criteria={query.criteria} page={page} />;
}
