'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, Empty } from '@/components/ui';
import type { NotificationItem, NotificationPage } from './types';
import styles from './notifications.module.css';

interface NotificationListViewProps {
  initialPage: NotificationPage;
  unreadOnly: boolean;
  initialUnreadCount: number;
}

const TYPE_LABELS: Record<NotificationItem['type'], string> = {
  penpal_request: '来信',
  request_accepted: '接受',
  new_letter: '新信',
  system: '系统',
};

function formatNotificationDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const currentYear = new Date().getFullYear();
  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === currentYear
      ? {
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      : {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        };

  return new Intl.DateTimeFormat('zh-CN', options).format(date);
}

async function postNotificationAction(path: string): Promise<boolean> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
  });

  return response.ok;
}

export function NotificationListView({
  initialPage,
  unreadOnly,
  initialUnreadCount,
}: NotificationListViewProps) {
  const [items, setItems] = useState<NotificationItem[]>(initialPage.items);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleMarkRead(item: NotificationItem) {
    setPendingId(item.id);
    setErrorMessage(null);

    try {
      const ok = await postNotificationAction(
        `/api/v1/notifications/${encodeURIComponent(item.id)}/read`,
      );

      if (!ok) {
        setErrorMessage('暂时无法标记这条通知，请稍后重试。');
        return;
      }

      setItems((current) =>
        unreadOnly
          ? current.filter((entry) => entry.id !== item.id)
          : current.map((entry) =>
              entry.id === item.id
                ? { ...entry, readAt: new Date().toISOString() }
                : entry,
            ),
      );
      setUnreadCount((current) => Math.max(current - 1, 0));
    } catch {
      setErrorMessage('网络不太好，请稍后重试。');
    } finally {
      setPendingId(null);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    setErrorMessage(null);

    try {
      const ok = await postNotificationAction('/api/v1/notifications/read-all');

      if (!ok) {
        setErrorMessage('暂时无法全部标记为已读，请稍后重试。');
        return;
      }

      setItems((current) =>
        unreadOnly
          ? []
          : current.map((entry) =>
              entry.readAt
                ? entry
                : { ...entry, readAt: new Date().toISOString() },
            ),
      );
      setUnreadCount(0);
    } catch {
      setErrorMessage('网络不太好，请稍后重试。');
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <h1 className={styles.title}>通知</h1>
            <p className={styles.description}>
              来信与回应会安静地留在这里。
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? '正在标记…' : '全部标为已读'}
          </Button>
        </header>

        <nav className={styles.filters} aria-label="通知筛选">
          <Link
            className={`${styles.filterItem} ${
              unreadOnly ? '' : styles.filterItemActive
            }`}
            href="/notifications"
            aria-current={unreadOnly ? undefined : 'page'}
          >
            全部
          </Link>
          <Link
            className={`${styles.filterItem} ${
              unreadOnly ? styles.filterItemActive : ''
            }`}
            href="/notifications?unread=1"
            aria-current={unreadOnly ? 'page' : undefined}
          >
            未读
          </Link>
        </nav>

        {errorMessage && (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        )}

        {items.length === 0 ? (
          <Empty
            title={unreadOnly ? '没有未读通知' : '还没有通知'}
            description={
              unreadOnly
                ? '所有通知都已经看过了。'
                : '当有人给你寄来信，这里会留下提醒。'
            }
            action={
              <Link className={styles.emptyAction} href="/find">
                去找笔友
              </Link>
            }
          />
        ) : (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id}>
                <Card
                  className={`${styles.itemCard} ${
                    item.readAt ? '' : styles.itemCardUnread
                  }`}
                >
                  <div className={styles.itemMeta}>
                    <span className={styles.typeTag}>
                      {TYPE_LABELS[item.type]}
                    </span>
                    {!item.readAt && (
                      <span className={styles.unreadTag}>未读</span>
                    )}
                    <time className={styles.time} dateTime={item.createdAt}>
                      {formatNotificationDate(item.createdAt)}
                    </time>
                  </div>
                  <h2 className={styles.itemTitle}>{item.title}</h2>
                  {item.body && <p className={styles.itemBody}>{item.body}</p>}
                  {!item.readAt && (
                    <div className={styles.itemActions}>
                      <Button
                        type="button"
                        variant="text"
                        onClick={() => handleMarkRead(item)}
                        disabled={pendingId === item.id}
                      >
                        {pendingId === item.id ? '正在标记…' : '标为已读'}
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
