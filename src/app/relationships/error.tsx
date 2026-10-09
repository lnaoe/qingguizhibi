'use client';

import { Error } from '@/components/ui';
import styles from '@/features/relationships/relationships.module.css';

interface RelationshipsErrorProps {
  reset: () => void;
}

export default function RelationshipsError({
  reset,
}: RelationshipsErrorProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Error
          message="暂时无法加载你的笔友，请稍后重试。"
          onRetry={reset}
        />
      </div>
    </main>
  );
}
