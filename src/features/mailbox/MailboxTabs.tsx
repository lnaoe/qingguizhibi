import Link from 'next/link';
import styles from './mailbox.module.css';

interface MailboxTabsProps {
  active: 'inbox' | 'sent' | 'drafts';
}

export function MailboxTabs({ active }: MailboxTabsProps) {
  return (
    <nav className={styles.tabs} aria-label="信箱分类">
      <Link
        className={`${styles.tab} ${
          active === 'inbox' ? styles.activeTab : ''
        }`}
        href="/mailbox"
        aria-current={active === 'inbox' ? 'page' : undefined}
      >
        来信
      </Link>
      <Link
        className={`${styles.tab} ${
          active === 'sent' ? styles.activeTab : ''
        }`}
        href="/mailbox/sent"
        aria-current={active === 'sent' ? 'page' : undefined}
      >
        寄出
      </Link>
      <Link
        className={`${styles.tab} ${
          active === 'drafts' ? styles.activeTab : ''
        }`}
        href="/mailbox/drafts"
        aria-current={active === 'drafts' ? 'page' : undefined}
      >
        草稿
      </Link>
    </nav>
  );
}
