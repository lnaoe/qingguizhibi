'use client';

import { Error } from '@/components/ui';
import styles from '@/features/profile/profile.module.css';

interface EditProfileErrorProps {
  reset: () => void;
}

export default function EditProfileError({ reset }: EditProfileErrorProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Error message="暂时无法打开资料编辑，请稍后重试。" onRetry={reset} />
      </div>
    </main>
  );
}
