import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { createLetterDraft } from '@/features/letters/draft-service';
import type { CreateLetterDraftResult } from '@/features/letters/types';
import { getCurrentUser } from '@/lib/auth';

type CreateLetterDraftFailureCode = Extract<
  CreateLetterDraftResult,
  { ok: false }
>['code'];

function errorResponse(
  status: number,
  code: 'unauthorized' | 'internal_error' | CreateLetterDraftFailureCode,
  message: string,
  details: Record<string, string> = {},
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request.headers);

  if (!user) {
    return errorResponse(401, 'unauthorized', '请先登录');
  }

  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return errorResponse(400, 'validation_error', '请求参数无效');
  }

  try {
    const result = createLetterDraft(db, user.id, input);

    if (!result.ok) {
      return errorResponse(
        result.code === 'validation_error' ? 400 : 404,
        result.code,
        result.message,
        result.errors ?? {},
      );
    }

    return NextResponse.json({ data: result.letter }, { status: 201 });
  } catch (error) {
    console.error('Failed to create letter draft.', error);
    return errorResponse(
      500,
      'internal_error',
      '暂时无法保存草稿，请稍后重试。',
    );
  }
}
