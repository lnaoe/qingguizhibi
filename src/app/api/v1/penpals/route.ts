import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { parseDiscoveryQuery } from '@/features/discovery/query';
import { discoverPenpals } from '@/features/discovery/service';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
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

  const query = parseDiscoveryQuery(new URL(request.url).searchParams);

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

  try {
    const page = discoverPenpals(db, user.id, query.criteria);

    return NextResponse.json({
      data: page.items,
      meta: {
        next_cursor: page.nextCursor,
        has_more: page.hasMore,
      },
    });
  } catch (error) {
    console.error('Failed to discover penpals.', error);
    return NextResponse.json(
      {
        error: {
          code: 'internal_error',
          message: '暂时无法加载笔友，请稍后重试',
          details: {},
        },
      },
      { status: 500 },
    );
  }
}
