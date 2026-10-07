import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './auth.module.css';

interface AuthPanelProps {
  titleId: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthPanel({
  titleId,
  title,
  description,
  children,
  footer,
}: AuthPanelProps) {
  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby={titleId}>
        <Link className={styles.brand} href="/">
          情归纸笔
        </Link>
        <header className={styles.heading}>
          <h1 id={titleId} className={styles.title}>
            {title}
          </h1>
          <p className={styles.description}>{description}</p>
        </header>
        {children}
        {footer && <div className={styles.footer}>{footer}</div>}
      </section>
    </main>
  );
}
