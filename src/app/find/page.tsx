import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { FindView } from '@/features/discovery/FindView';
import { createDiscoverySearchParams } from '@/features/discovery/find-query';
import { parseDiscoveryQuery } from '@/features/discovery/query';
import { discoverPenpals } from '@/features/discovery/service';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '找笔友',
};

interface FindPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FindPage({ searchParams }: FindPageProps) {
  const user = await getCurrentUser(await headers());

  if (!user) {
    redirect('/login');
  }

  const onboarding = getOnboardingSnapshot(db, user.id);

  if (!onboarding.onboardingCompleted) {
    redirect('/onboarding');
  }

  const query = parseDiscoveryQuery(
    createDiscoverySearchParams(await searchParams),
  );

  if (!query.ok) {
    return (
      <FindView
        criteria={null}
        page={null}
        errorMessage="筛选条件无效，请重新选择。"
      />
    );
  }

  const page = discoverPenpals(db, user.id, query.criteria);

  return <FindView criteria={query.criteria} page={page} />;
}
