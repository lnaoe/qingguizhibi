import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { markNotificationRead } from '@/features/notifications/service';
import { getCurrentUser } from '@/lib/auth';

function errorResponse(
  status: number,
  code: 'not_found' | 'unauthorized' | 'internal_error',
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
    const result = markNotificationRead(db, user.id, id);

    if (!result.ok) {
      return errorResponse(404, 'not_found', result.message);
    }

    return NextResponse.json({
      data: {
        notification: result.notification,
        already_read: result.alreadyRead,
      },
    });
  } catch (error) {
    console.error('Failed to mark notification as read.', error);
    return errorResponse(
      500,
      'internal_error',
      '暂时无法标记这条通知，请稍后重试。',
    );
  }
}
