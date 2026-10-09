import { Loading } from '@/components/ui';
import styles from '@/features/relationships/relationships.module.css';

export default function RelationshipsLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Loading text="正在打开你的笔友..." />
      </div>
    </main>
  );
}
