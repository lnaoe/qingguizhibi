import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { getProfileSnapshot } from '@/features/profile/service';
import { SettingsView } from '@/features/settings/SettingsView';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '设置',
};

export default async function SettingsPage() {
  const user = await getCurrentUser(await headers());

  if (!user) {
    redirect('/login');
  }

  const snapshot = getProfileSnapshot(db, user.id);

  if (!snapshot) {
    redirect('/onboarding');
  }

  return (
    <SettingsView email={user.email} visibility={snapshot.values.visibility} />
  );
}
