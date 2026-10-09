import { Loading } from '@/components/ui';
import styles from '@/features/relationships/relationships.module.css';

export default function RelationshipDetailLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.detailShell}>
        <Loading text="正在打开通信记录..." />
      </div>
    </main>
  );
}
