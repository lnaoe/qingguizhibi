import { Loading } from '@/components/ui';
import styles from './page.module.css';

export default function RootLoading() {
  return (
    <main className={styles.main}>
      <Loading text="正在准备今天的内容..." />
    </main>
  );
}
