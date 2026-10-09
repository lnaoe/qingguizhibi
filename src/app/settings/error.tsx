'use client';

import { Error } from '@/components/ui';
import styles from '@/features/settings/settings.module.css';

interface SettingsErrorProps {
  reset: () => void;
}

export default function SettingsError({ reset }: SettingsErrorProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Error message="暂时无法加载设置，请稍后重试。" onRetry={reset} />
      </div>
    </main>
  );
}
