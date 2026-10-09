'use client';

import { Error } from '@/components/ui';
import styles from '@/features/relationships/relationships.module.css';

interface RelationshipDetailErrorProps {
  reset: () => void;
}

export default function RelationshipDetailError({
  reset,
}: RelationshipDetailErrorProps) {
  return (
    <main className={styles.page}>
      <div className={styles.detailShell}>
        <Error
          message="暂时无法加载通信记录，请稍后重试。"
          onRetry={reset}
        />
      </div>
    </main>
  );
}
