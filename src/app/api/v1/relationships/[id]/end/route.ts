import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { endRelationship } from '@/features/relationships/service';
import type { EndRelationshipFailureCode } from '@/features/relationships/types';
import { getCurrentUser } from '@/lib/auth';

type EndFailureCode =
  | EndRelationshipFailureCode
  | 'unauthorized'
  | 'internal_error';

function errorResponse(
  status: number,
  code: EndFailureCode,
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

function failureStatus(code: EndRelationshipFailureCode): number {
  switch (code) {
    case 'relationship_not_found':
    case 'forbidden':
      return 404;
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
    const result = endRelationship(db, user.id, id);

    if (!result.ok) {
      return errorResponse(
        failureStatus(result.code),
        result.code,
        result.message,
      );
    }

    return NextResponse.json({
      data: {
        relationship: result.relationship,
        already_ended: result.alreadyEnded,
      },
    });
  } catch (error) {
    console.error('Failed to end relationship.', error);
    return errorResponse(
      500,
      'internal_error',
      '暂时无法结束这段通信关系，请稍后重试',
    );
  }
}
