import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './BottomNav.module.css';

export type BottomNavSection = 'home' | 'find' | 'mailbox' | 'me';

interface BottomNavItem {
  id: BottomNavSection;
  label: string;
  href: string;
  icon: ReactNode;
}

interface BottomNavProps {
  active: BottomNavSection;
}

const ITEMS: BottomNavItem[] = [
  {
    id: 'home',
    label: '首页',
    href: '/',
    icon: (
      <svg
        aria-hidden="true"
        fill="none"
        height="20"
        viewBox="0 0 24 24"
        width="20"
      >
        <path d="m3 10.5 9-7.5 9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    id: 'find',
    label: '找笔友',
    href: '/find',
    icon: (
      <svg
        aria-hidden="true"
        fill="none"
        height="20"
        viewBox="0 0 24 24"
        width="20"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4.4-4.4" />
      </svg>
    ),
  },
  {
    id: 'mailbox',
    label: '信箱',
    href: '/mailbox',
    icon: (
      <svg
        aria-hidden="true"
        fill="none"
        height="20"
        viewBox="0 0 24 24"
        width="20"
      >
        <rect height="14" rx="1.5" width="18" x="3" y="5" />
        <path d="m3.5 7 8.5 6 8.5-6" />
      </svg>
    ),
  },
  {
    id: 'me',
    label: '我的',
    href: '/my',
    icon: (
      <svg
        aria-hidden="true"
        fill="none"
        height="20"
        viewBox="0 0 24 24"
        width="20"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M5.5 21c.7-3.3 2.9-5.5 6.5-5.5s5.8 2.2 6.5 5.5" />
      </svg>
    ),
  },
];

export const BottomNav = ({ active }: BottomNavProps) => {
  return (
    <nav className={styles.bottomNav} aria-label="主导航">
      {ITEMS.map((item) => (
        <Link
          key={item.id}
          className={`${styles.item} ${
            active === item.id ? styles.active : ''
          }`}
          href={item.href}
          aria-current={active === item.id ? 'page' : undefined}
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};
