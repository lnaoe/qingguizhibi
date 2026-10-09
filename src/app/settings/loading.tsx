import { Loading } from '@/components/ui';
import styles from '@/features/settings/settings.module.css';

export default function SettingsLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Loading text="正在加载设置..." />
      </div>
    </main>
  );
}
