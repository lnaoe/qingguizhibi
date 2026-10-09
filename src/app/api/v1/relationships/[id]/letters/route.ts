import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { parseRelationshipLettersQuery } from '@/features/relationships/query';
import { listRelationshipLetters } from '@/features/relationships/service';
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

  const query = parseRelationshipLettersQuery(
    new URL(request.url).searchParams,
  );

  if (!query.ok) {
    return NextResponse.json(
      {
        error: {
          code: 'validation_error',
          message: '请求参数无效',
          details: query.errors,
        },
      },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  try {
    const page = listRelationshipLetters(db, user.id, id, query.criteria);

    if (!page) {
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

    return NextResponse.json({
      data: page.items,
      meta: {
        next_cursor: page.nextCursor,
        has_more: page.hasMore,
      },
    });
  } catch (error) {
    console.error('Failed to list relationship letters.', error);
    return NextResponse.json(
      {
        error: {
          code: 'internal_error',
          message: '暂时无法加载通信记录，请稍后重试',
          details: {},
        },
      },
      { status: 500 },
    );
  }
}
