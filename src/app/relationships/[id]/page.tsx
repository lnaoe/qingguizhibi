import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db/client';
import { RelationshipDetailView } from '@/features/relationships/RelationshipDetailView';
import {
  createRelationshipSearchParams,
  parseRelationshipLettersQuery,
} from '@/features/relationships/query';
import {
  getRelationshipDetail,
  listRelationshipLetters,
} from '@/features/relationships/service';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '通信记录',
};

interface RelationshipDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RelationshipDetailPage({
  params,
  searchParams,
}: RelationshipDetailPageProps) {
  const user = await getCurrentUser(await headers());

  if (!user) {
    redirect('/login');
  }

  const onboarding = getOnboardingSnapshot(db, user.id);

  if (!onboarding.onboardingCompleted) {
    redirect('/onboarding');
  }

  const { id } = await params;
  const relationship = getRelationshipDetail(db, user.id, id);

  if (!relationship) {
    notFound();
  }

  const query = parseRelationshipLettersQuery(
    createRelationshipSearchParams(await searchParams),
  );

  if (!query.ok) {
    return (
      <RelationshipDetailView
        relationship={relationship}
        page={null}
        errorMessage="通信记录的分页参数无效，请回到最新记录。"
      />
    );
  }

  const page = listRelationshipLetters(
    db,
    user.id,
    relationship.id,
    query.criteria,
  );

  if (!page) {
    notFound();
  }

  return (
    <RelationshipDetailView
      relationship={relationship}
      page={page}
      viewingOlder={query.criteria.cursor !== null}
    />
  );
}
