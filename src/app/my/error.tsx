'use client';

import { Error } from '@/components/ui';
import styles from '@/features/me/me.module.css';

interface MyErrorProps {
  reset: () => void;
}

export default function MyError({ reset }: MyErrorProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Error message="暂时无法加载我的页面，请稍后重试。" onRetry={reset} />
      </div>
    </main>
  );
}
