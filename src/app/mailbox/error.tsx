'use client';

import { Error } from '@/components/ui';
import styles from '@/features/mailbox/mailbox.module.css';

interface MailboxErrorProps {
  reset: () => void;
}

export default function MailboxError({ reset }: MailboxErrorProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Error message="暂时无法打开信箱，请稍后重试。" onRetry={reset} />
      </div>
    </main>
  );
}
