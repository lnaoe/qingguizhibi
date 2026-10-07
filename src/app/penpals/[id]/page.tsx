import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db/client';
import { PenpalDetailView } from '@/features/discovery/PenpalDetailView';
import { getPublicPenpalProfile } from '@/features/discovery/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '笔友详情',
};

interface PenpalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PenpalDetailPage({
  params,
}: PenpalDetailPageProps) {
  const user = await getCurrentUser(await headers());

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const profile = getPublicPenpalProfile(db, id, user.id);

  if (!profile) {
    notFound();
  }

  return (
    <PenpalDetailView
      profile={profile}
      canWrite={profile.id !== user.id}
    />
  );
}
