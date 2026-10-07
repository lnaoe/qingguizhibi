'use server';

import { headers } from 'next/headers';
import { db } from '@/db/client';
import { getCurrentUser } from '@/lib/auth';
import { saveProfile } from './service';
import type { SaveProfileResult } from './types';

export async function saveProfileAction(
  input: unknown,
): Promise<SaveProfileResult> {
  const user = await getCurrentUser(await headers());

  if (!user) {
    return {
      ok: false,
      formError: '登录状态已失效，请重新登录。',
    };
  }

  try {
    return saveProfile(db, user.id, input);
  } catch (error) {
    console.error('Failed to save profile.', error);
    return {
      ok: false,
      formError: '资料保存失败，请稍后重试。',
    };
  }
}
