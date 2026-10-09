'use client';

import { Error } from '@/components/ui';
import styles from '@/features/notifications/notifications.module.css';

interface NotificationsErrorProps {
  reset: () => void;
}

export default function NotificationsError({
  reset,
}: NotificationsErrorProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Error message="暂时无法加载通知，请稍后重试。" onRetry={reset} />
      </div>
    </main>
  );
}
