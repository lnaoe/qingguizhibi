'use client';

import { Error } from '@/components/ui';
import styles from '@/features/discovery/find.module.css';

interface FindErrorProps {
  reset: () => void;
}

export default function FindError({ reset }: FindErrorProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Error
          message="暂时无法加载笔友，请稍后重试。"
          onRetry={reset}
        />
      </div>
    </main>
  );
}
