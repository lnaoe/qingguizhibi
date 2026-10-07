import { Loading } from '@/components/ui';
import styles from '@/features/discovery/penpal.module.css';

export default function PenpalDetailLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Loading text="正在打开这个人..." />
      </div>
    </main>
  );
}
