import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { parseNotificationQuery } from '@/features/notifications/query';
import { listNotifications } from '@/features/notifications/service';
import { getCurrentUser } from '@/lib/auth';

function errorResponse(
  status: number,
  code: 'validation_error' | 'unauthorized' | 'internal_error',
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

export async function GET(request: Request) {
  const user = await getCurrentUser(request.headers);

  if (!user) {
    return errorResponse(401, 'unauthorized', '请先登录');
  }

  const parsed = parseNotificationQuery(new URL(request.url).searchParams);

  if (!parsed.ok) {
    return errorResponse(400, 'validation_error', '请求参数无效', parsed.errors);
  }

  try {
    const page = listNotifications(db, user.id, parsed.criteria);

    return NextResponse.json({
      data: page.items,
      meta: {
        next_cursor: page.nextCursor,
        has_more: page.hasMore,
      },
    });
  } catch (error) {
    console.error('Failed to load notifications.', error);
    return errorResponse(500, 'internal_error', '暂时无法加载通知，请稍后重试。');
  }
}
