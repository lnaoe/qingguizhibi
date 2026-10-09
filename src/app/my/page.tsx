import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { MeView } from '@/features/me/MeView';
import { getProfileSnapshot } from '@/features/profile/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '我的',
};

export default async function MyPage() {
  const user = await getCurrentUser(await headers());

  if (!user) {
    redirect('/login');
  }

  const snapshot = getProfileSnapshot(db, user.id);

  if (!snapshot) {
    redirect('/onboarding');
  }

  return <MeView snapshot={snapshot} />;
}
