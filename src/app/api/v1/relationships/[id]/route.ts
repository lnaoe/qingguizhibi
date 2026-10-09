import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { getRelationshipDetail } from '@/features/relationships/service';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(request.headers);

  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: 'unauthorized',
          message: '请先登录',
          details: {},
        },
      },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  try {
    const relationship = getRelationshipDetail(db, user.id, id);

    if (!relationship) {
      return NextResponse.json(
        {
          error: {
            code: 'not_found',
            message: '找不到这段通信关系',
            details: {},
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: relationship });
  } catch (error) {
    console.error('Failed to load relationship.', error);
    return NextResponse.json(
      {
        error: {
          code: 'internal_error',
          message: '暂时无法加载这段通信关系，请稍后重试',
          details: {},
        },
      },
      { status: 500 },
    );
  }
}
