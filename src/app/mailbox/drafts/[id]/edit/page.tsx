import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db/client';
import { getDraftForEditing } from '@/features/letters/draft-service';
import { ReplyLetterForm } from '@/features/letters/ReplyLetterForm';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: '编辑草稿',
};

interface EditDraftPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDraftPage({
  params,
}: EditDraftPageProps) {
  const user = await getCurrentUser(await headers());

  if (!user) {
    redirect('/login');
  }

  const onboarding = getOnboardingSnapshot(db, user.id);

  if (!onboarding.onboardingCompleted) {
    redirect('/onboarding');
  }

  const { id } = await params;
  const result = getDraftForEditing(db, user.id, id);

  if (!result.ok) {
    notFound();
  }

  return (
    <ReplyLetterForm
      key={result.draft.id}
      relationshipId={result.draft.relationshipId}
      recipient={result.draft.recipient}
      initialDraftId={result.draft.id}
      initialSubject={result.draft.subject}
      initialBody={result.draft.body}
      mode="draft"
    />
  );
}
