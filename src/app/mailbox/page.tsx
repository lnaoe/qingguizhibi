import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { MailboxInboxView } from '@/features/mailbox/MailboxInboxView';
import {
  createMailboxSearchParams,
  parseMailboxQuery,
} from '@/features/mailbox/query';
import { getInboxPage } from '@/features/mailbox/service';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '信箱',
};

interface MailboxPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MailboxPage({ searchParams }: MailboxPageProps) {
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
      <MailboxInboxView
        criteria={null}
        page={null}
        errorMessage="信箱链接无效，请打开最新来信。"
      />
    );
  }

  const page = getInboxPage(db, user.id, query.criteria);

  return <MailboxInboxView criteria={query.criteria} page={page} />;
}
