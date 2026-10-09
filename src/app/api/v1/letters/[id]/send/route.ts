import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { sendLetter } from '@/features/letters/send-service';
import type { SendLetterFailureCode } from '@/features/letters/types';
import { getCurrentUser } from '@/lib/auth';

type SendLetterRouteFailureCode =
  | 'unauthorized'
  | 'internal_error'
  | SendLetterFailureCode;

interface SendLetterRouteContext {
  params: Promise<{ id: string }>;
}

function errorResponse(
  status: number,
  code: SendLetterRouteFailureCode,
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

function failureStatus(code: SendLetterFailureCode): number {
  switch (code) {
    case 'validation_error':
      return 400;
    case 'letter_not_found':
      return 404;
    case 'forbidden':
      return 403;
    case 'relationship_not_active':
    case 'blocked':
      return 422;
  }
}

export async function POST(
  request: Request,
  context: SendLetterRouteContext,
) {
  const user = await getCurrentUser(request.headers);

  if (!user) {
    return errorResponse(401, 'unauthorized', '请先登录');
  }

  const { id } = await context.params;

  try {
    const result = sendLetter(db, user.id, id);

    if (!result.ok) {
      return errorResponse(
        failureStatus(result.code),
        result.code,
        result.message,
        result.errors ?? {},
      );
    }

    return NextResponse.json({
      data: {
        letter: result.letter,
        already_sent: result.alreadySent,
      },
    });
  } catch (error) {
    console.error('Failed to send letter.', error);
    return errorResponse(
      500,
      'internal_error',
      '暂时无法寄出这封信，请稍后重试。',
    );
  }
}
