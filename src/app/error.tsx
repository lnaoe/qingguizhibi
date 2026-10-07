'use client';

import { Error } from '@/components/ui';
import styles from './page.module.css';

interface RootErrorProps {
  reset: () => void;
}

export default function RootError({ reset }: RootErrorProps) {
  return (
    <main className={styles.main}>
      <Error
        message="页面暂时无法加载，请稍后重试。"
        onRetry={reset}
      />
    </main>
  );
}
