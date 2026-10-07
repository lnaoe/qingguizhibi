import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db/client';
import { ComposeLetterForm } from '@/features/letters/ComposeLetterForm';
import { getPublicPenpalProfile } from '@/features/discovery/service';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '写第一封信',
};

interface WriteLetterPageProps {
  params: Promise<{ id: string }>;
}

export default async function WriteLetterPage({
  params,
}: WriteLetterPageProps) {
  const user = await getCurrentUser(await headers());

  if (!user) {
    redirect('/login');
  }

  const onboarding = getOnboardingSnapshot(db, user.id);

  if (!onboarding.onboardingCompleted) {
    redirect('/onboarding');
  }

  const { id } = await params;
  const recipient = getPublicPenpalProfile(db, id, user.id);

  if (!recipient || recipient.id === user.id) {
    notFound();
  }

  return (
    <ComposeLetterForm
      recipient={{
        id: recipient.id,
        nickname: recipient.nickname,
        avatarUrl: recipient.avatarUrl,
      }}
    />
  );
}
