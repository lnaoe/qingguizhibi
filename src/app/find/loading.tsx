import { Loading } from '@/components/ui';
import styles from '@/features/discovery/find.module.css';

export default function FindLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Loading text="正在寻找合适的笔友..." />
      </div>
    </main>
  );
}
