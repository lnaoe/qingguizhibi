import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { db } from '@/db/client';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '认识自己',
};

export default async function OnboardingPage() {
  const user = await getCurrentUser(await headers());

  if (!user) {
    redirect('/login');
  }

  const snapshot = getOnboardingSnapshot(db, user.id);

  if (snapshot.onboardingCompleted) {
    redirect('/');
  }

  return <OnboardingFlow initialValues={snapshot.values} />;
}
