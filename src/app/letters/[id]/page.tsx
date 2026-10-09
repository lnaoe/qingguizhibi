import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db/client';
import { getLetterDetail, markLetterRead } from '@/features/letters/detail-service';
import { LetterDetailView } from '@/features/letters/LetterDetailView';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '信件详情',
};

interface LetterDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LetterDetailPage({
  params,
}: LetterDetailPageProps) {
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

  const letter =
    detail.letter.recipient.id === user.id
      ? markLetterRead(db, user.id, id)
      : detail;

  if (!letter.ok) {
    notFound();
  }

  return (
    <LetterDetailView letter={letter.letter} currentUserId={user.id} />
  );
}
