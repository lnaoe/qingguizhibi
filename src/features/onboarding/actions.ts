'use server';

import { headers } from 'next/headers';
import { db } from '@/db/client';
import { getCurrentUser } from '@/lib/auth';
import { saveOnboardingProfile } from './service';
import type { CompleteOnboardingResult } from './types';

export async function completeOnboardingAction(
  input: unknown,
): Promise<CompleteOnboardingResult> {
  const user = await getCurrentUser(await headers());

  if (!user) {
    return {
      ok: false,
      formError: '登录状态已失效，请重新登录。',
    };
  }

  try {
    return saveOnboardingProfile(db, user.id, user.email, input);
  } catch (error) {
    console.error('Failed to save onboarding profile.', error);
    return {
      ok: false,
      formError: '资料保存失败，请稍后重试。',
    };
  }
}
