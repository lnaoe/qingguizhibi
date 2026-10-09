import { Loading } from '@/components/ui';
import styles from '@/features/mailbox/mailbox.module.css';

export default function MailboxLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Loading text="正在打开信箱..." />
      </div>
    </main>
  );
}
