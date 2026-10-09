import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db/client';
import { ReplyLetterForm } from '@/features/letters/ReplyLetterForm';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { getRelationshipDetail } from '@/features/relationships/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '写信',
};

interface RelationshipWritePageProps {
  params: Promise<{ id: string }>;
}

export default async function RelationshipWritePage({
  params,
}: RelationshipWritePageProps) {
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

  if (!relationship || relationship.status !== 'active') {
    notFound();
  }

  const relationshipHref = `/relationships/${encodeURIComponent(
    relationship.id,
  )}`;

  return (
    <ReplyLetterForm
      relationshipId={relationship.id}
      recipient={{
        id: relationship.peer.id,
        nickname: relationship.peer.nickname,
        avatarUrl: relationship.peer.avatarUrl,
      }}
      mode="letter"
      returnHref={relationshipHref}
      returnLabel="返回通信记录"
      title="写信"
    />
  );
}
