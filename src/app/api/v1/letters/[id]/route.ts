import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { updateLetterDraft } from '@/features/letters/draft-service';
import { getLetterDetail } from '@/features/letters/detail-service';
import type {
  GetLetterDetailResult,
  UpdateLetterDraftResult,
} from '@/features/letters/types';
import { getCurrentUser } from '@/lib/auth';

type UpdateLetterDraftFailureCode = Extract<
  UpdateLetterDraftResult,
  { ok: false }
>['code'];

type GetLetterDetailFailureCode = Extract<
  GetLetterDetailResult,
  { ok: false }
>['code'];

type LetterRouteFailureCode =
  | 'unauthorized'
  | 'internal_error'
  | UpdateLetterDraftFailureCode
  | GetLetterDetailFailureCode;

interface LetterRouteContext {
  params: Promise<{ id: string }>;
}

function errorResponse(
  status: number,
  code: LetterRouteFailureCode,
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

function failureStatus(
  code: UpdateLetterDraftFailureCode | GetLetterDetailFailureCode,
): number {
  return code === 'validation_error' ? 400 : 404;
}

export async function GET(
  request: Request,
  context: LetterRouteContext,
) {
  const user = await getCurrentUser(request.headers);

  if (!user) {
    return errorResponse(401, 'unauthorized', '请先登录');
  }

  const { id } = await context.params;

  try {
    const result = getLetterDetail(db, user.id, id);

    if (!result.ok) {
      return errorResponse(
        failureStatus(result.code),
        result.code,
        result.message,
      );
    }

    return NextResponse.json({ data: result.letter });
  } catch (error) {
    console.error('Failed to load letter detail.', error);
    return errorResponse(
      500,
      'internal_error',
      '暂时无法打开这封信，请稍后重试。',
    );
  }
}

export async function PATCH(
  request: Request,
  context: LetterRouteContext,
) {
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

  const { id } = await context.params;

  try {
    const result = updateLetterDraft(db, user.id, id, input);

    if (!result.ok) {
      return errorResponse(
        failureStatus(result.code),
        result.code,
        result.message,
        result.errors ?? {},
      );
    }

    return NextResponse.json({ data: result.letter });
  } catch (error) {
    console.error('Failed to update letter draft.', error);
    return errorResponse(
      500,
      'internal_error',
      '暂时无法保存草稿，请稍后重试。',
    );
  }
}
