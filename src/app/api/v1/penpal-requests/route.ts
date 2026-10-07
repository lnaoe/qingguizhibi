import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { createFirstContact } from '@/features/requests/service';
import type { CreateFirstContactFailureCode } from '@/features/requests/types';
import { getCurrentUser } from '@/lib/auth';

function errorResponse(
  status: number,
  code: CreateFirstContactFailureCode | 'unauthorized' | 'internal_error',
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

function failureStatus(code: CreateFirstContactFailureCode): number {
  switch (code) {
    case 'validation_error':
      return 400;
    case 'sender_not_ready':
      return 409;
    case 'receiver_not_found':
      return 404;
    case 'self_request':
    case 'blocked':
      return 422;
    case 'active_relationship':
    case 'duplicate_request':
      return 409;
  }
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
    const result = createFirstContact(db, user.id, input);

    if (!result.ok) {
      return errorResponse(
        failureStatus(result.code),
        result.code,
        result.message,
        result.errors,
      );
    }

    return NextResponse.json(
      {
        data: {
          request: result.request,
          letter: result.letter,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create first contact.', error);
    return errorResponse(
      500,
      'internal_error',
      '暂时无法寄出这封信，请稍后重试。',
    );
  }
}
