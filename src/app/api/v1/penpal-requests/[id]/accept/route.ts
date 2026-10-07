import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { acceptPenpalRequest } from '@/features/requests/respond-service';
import type { RespondToRequestFailureCode } from '@/features/requests/types';
import { getCurrentUser } from '@/lib/auth';

type AcceptFailureCode =
  | RespondToRequestFailureCode
  | 'unauthorized'
  | 'internal_error';

function errorResponse(
  status: number,
  code: AcceptFailureCode,
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

function failureStatus(code: RespondToRequestFailureCode): number {
  switch (code) {
    case 'request_not_found':
      return 404;
    case 'forbidden':
      return 403;
    case 'blocked':
      return 422;
    case 'request_not_pending':
      return 409;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(request.headers);

  if (!user) {
    return errorResponse(401, 'unauthorized', '请先登录');
  }

  const { id } = await context.params;

  try {
    const result = acceptPenpalRequest(db, user.id, id);

    if (!result.ok) {
      return errorResponse(failureStatus(result.code), result.code, result.message);
    }

    return NextResponse.json({
      data: {
        request: result.request,
        relationship: result.relationship,
        already_accepted: result.alreadyAccepted,
      },
    });
  } catch (error) {
    console.error('Failed to accept penpal request.', error);
    return errorResponse(
      500,
      'internal_error',
      '暂时无法接受这封来信，请稍后重试。',
    );
  }
}
