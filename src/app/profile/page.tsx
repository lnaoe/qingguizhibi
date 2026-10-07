import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { ProfileView } from '@/features/profile/ProfileView';
import { getProfileSnapshot } from '@/features/profile/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '我的资料',
};

export default async function ProfilePage() {
  const user = await getCurrentUser(await headers());

  if (!user) {
    redirect('/login');
  }

  const snapshot = getProfileSnapshot(db, user.id);

  if (!snapshot) {
    redirect('/onboarding');
  }

  return <ProfileView snapshot={snapshot} />;
}
