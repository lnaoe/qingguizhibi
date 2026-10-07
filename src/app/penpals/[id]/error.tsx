'use client';

import { Error } from '@/components/ui';
import styles from '@/features/discovery/penpal.module.css';

interface PenpalDetailErrorProps {
  reset: () => void;
}

export default function PenpalDetailError({
  reset,
}: PenpalDetailErrorProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Error
          message="暂时无法打开这份资料，请稍后重试。"
          onRetry={reset}
        />
      </div>
    </main>
  );
}
