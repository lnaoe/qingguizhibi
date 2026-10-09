import { Loading } from '@/components/ui';
import styles from '@/features/me/me.module.css';

export default function MyLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Loading text="正在加载我的页面..." />
      </div>
    </main>
  );
}
