import { Loading } from '@/components/ui';
import styles from '@/features/notifications/notifications.module.css';

export default function NotificationsLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Loading text="正在查看通知..." />
      </div>
    </main>
  );
}
