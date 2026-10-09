'use client';

import { Error } from '@/components/ui';
import styles from '@/features/profile/profile.module.css';

interface ProfileErrorProps {
  reset: () => void;
}

export default function ProfileError({ reset }: ProfileErrorProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Error message="暂时无法加载你的资料，请稍后重试。" onRetry={reset} />
      </div>
    </main>
  );
}
