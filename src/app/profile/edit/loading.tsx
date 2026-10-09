import { Loading } from '@/components/ui';
import styles from '@/features/profile/profile.module.css';

export default function EditProfileLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Loading text="正在加载资料编辑..." />
      </div>
    </main>
  );
}
