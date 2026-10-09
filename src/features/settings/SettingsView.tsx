import Link from 'next/link';
import { Card } from '@/components/ui';
import {
  PROFILE_VISIBILITY_LABELS,
  type ProfileVisibility,
} from '../profile/options';
import { SETTINGS_LINKS } from './entries';
import { SignOutButton } from './SignOutButton';
import styles from './settings.module.css';

interface SettingsViewProps {
  email: string;
  visibility: ProfileVisibility;
}

export function SettingsView({ email, visibility }: SettingsViewProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>设置</h1>
          </div>
        </header>

        <section className={styles.section} aria-labelledby="settings-privacy">
          <h2 id="settings-privacy" className={styles.sectionTitle}>
            隐私
          </h2>

          <nav className={styles.sectionList} aria-label="隐私设置">
            {SETTINGS_LINKS.map((link) => (
              <Link
                key={link.href}
                className={styles.sectionLink}
                href={link.href}
              >
                <span className={styles.sectionCopy}>
                  <span className={styles.sectionLabel}>{link.label}</span>
                  <span className={styles.sectionDescription}>
                    {link.description}
                  </span>
                  <span className={styles.currentValue}>
                    当前：{PROFILE_VISIBILITY_LABELS[visibility]}
                  </span>
                </span>
                <span className={styles.chevron} aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </section>

        <section className={styles.section} aria-labelledby="settings-account">
          <h2 id="settings-account" className={styles.sectionTitle}>
            账号
          </h2>

          <Card className={styles.accountCard}>
            <div className={styles.accountField}>
              <span className={styles.accountLabel}>登录邮箱</span>
              <span className={styles.accountValue}>{email}</span>
            </div>
            <SignOutButton />
          </Card>
        </section>

        <Link className={styles.backLink} href="/my">
          返回我的
        </Link>
      </div>
    </main>
  );
}
