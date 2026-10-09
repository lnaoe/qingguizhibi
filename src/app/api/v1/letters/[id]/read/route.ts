import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { markLetterRead } from '@/features/letters/detail-service';
import type { MarkLetterReadResult } from '@/features/letters/types';
import { getCurrentUser } from '@/lib/auth';

type MarkLetterReadFailureCode = Extract<
  MarkLetterReadResult,
  { ok: false }
>['code'];

type MarkLetterReadRouteFailureCode =
  | 'unauthorized'
  | 'internal_error'
  | MarkLetterReadFailureCode;

interface LetterReadRouteContext {
  params: Promise<{ id: string }>;
}

function errorResponse(
  status: number,
  code: MarkLetterReadRouteFailureCode,
  message: string,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details: {},
      },
    },
    { status },
  );
}

function failureStatus(code: MarkLetterReadFailureCode): number {
  return code === 'forbidden' ? 403 : 404;
}

export async function POST(
  request: Request,
  context: LetterReadRouteContext,
) {
  const user = await getCurrentUser(request.headers);

  if (!user) {
    return errorResponse(401, 'unauthorized', '请先登录');
  }

  const { id } = await context.params;

  try {
    const result = markLetterRead(db, user.id, id);

    if (!result.ok) {
      return errorResponse(
        failureStatus(result.code),
        result.code,
        result.message,
      );
    }

    return NextResponse.json({
      data: {
        letter: result.letter,
        already_read: result.alreadyRead,
      },
    });
  } catch (error) {
    console.error('Failed to mark letter read.', error);
    return errorResponse(
      500,
      'internal_error',
      '暂时无法更新来信状态，请稍后重试。',
    );
  }
}
