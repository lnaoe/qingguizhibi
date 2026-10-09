import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { RelationshipsView } from '@/features/relationships/RelationshipsView';
import {
  createRelationshipSearchParams,
  parseRelationshipQuery,
} from '@/features/relationships/query';
import { listRelationships } from '@/features/relationships/service';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '我的笔友',
};

interface RelationshipsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RelationshipsPage({
  searchParams,
}: RelationshipsPageProps) {
  const user = await getCurrentUser(await headers());

  if (!user) {
    redirect('/login');
  }

  const onboarding = getOnboardingSnapshot(db, user.id);

  if (!onboarding.onboardingCompleted) {
    redirect('/onboarding');
  }

  const query = parseRelationshipQuery(
    createRelationshipSearchParams(await searchParams),
  );

  if (!query.ok) {
    return (
      <RelationshipsView
        criteria={null}
        page={null}
        errorMessage="筛选条件无效，请重新选择。"
      />
    );
  }

  const page = listRelationships(db, user.id, query.criteria);

  return <RelationshipsView criteria={query.criteria} page={page} />;
}
