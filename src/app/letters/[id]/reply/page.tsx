import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db/client';
import {
  getLetterDetail,
  markLetterRead,
} from '@/features/letters/detail-service';
import { ReplyLetterForm } from '@/features/letters/ReplyLetterForm';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '回信',
};

interface ReplyLetterPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReplyLetterPage({
  params,
}: ReplyLetterPageProps) {
  const user = await getCurrentUser(await headers());

  if (!user) {
    redirect('/login');
  }

  const onboarding = getOnboardingSnapshot(db, user.id);

  if (!onboarding.onboardingCompleted) {
    redirect('/onboarding');
  }

  const { id } = await params;
  const detail = getLetterDetail(db, user.id, id);

  if (!detail.ok) {
    notFound();
  }

  const letterResult =
    detail.letter.recipient.id === user.id
      ? markLetterRead(db, user.id, id)
      : detail;

  if (!letterResult.ok) {
    notFound();
  }

  const letter = letterResult.letter;

  if (
    letter.recipient.id !== user.id ||
    !letter.replyRelationshipId
  ) {
    notFound();
  }

  return (
    <ReplyLetterForm
      relationshipId={letter.replyRelationshipId}
      recipient={{
        id: letter.sender.id,
        nickname: letter.sender.nickname,
        avatarUrl: letter.sender.avatarUrl,
      }}
      sourceLetterId={letter.id}
    />
  );
}
