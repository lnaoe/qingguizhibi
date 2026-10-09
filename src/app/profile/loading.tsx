import { Loading } from '@/components/ui';
import styles from '@/features/profile/profile.module.css';

export default function ProfileLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Loading text="正在加载你的资料..." />
      </div>
    </main>
  );
}
