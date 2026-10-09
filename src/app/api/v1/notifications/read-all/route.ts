import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { markAllNotificationsRead } from '@/features/notifications/service';
import { getCurrentUser } from '@/lib/auth';

function errorResponse(
  status: number,
  code: 'unauthorized' | 'internal_error',
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

export async function POST(request: Request) {
  const user = await getCurrentUser(request.headers);

  if (!user) {
    return errorResponse(401, 'unauthorized', '请先登录');
  }

  try {
    const result = markAllNotificationsRead(db, user.id);

    return NextResponse.json({
      data: {
        updated_count: result.updatedCount,
      },
    });
  } catch (error) {
    console.error('Failed to mark all notifications as read.', error);
    return errorResponse(
      500,
      'internal_error',
      '暂时无法全部标记为已读，请稍后重试。',
    );
  }
}
