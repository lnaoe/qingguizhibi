import Link from 'next/link';
import { Avatar, BottomNav, Card } from '@/components/ui';
import { PROFILE_VISIBILITY_LABELS } from '../profile/options';
import type { ProfileSnapshot } from '../profile/types';
import { ME_SECTIONS } from './entries';
import styles from './me.module.css';

interface MeViewProps {
  snapshot: ProfileSnapshot;
}

export function MeView({ snapshot }: MeViewProps) {
  const { values } = snapshot;
  const location = [values.country, values.city].filter(Boolean).join(' · ');

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>我的</h1>
          </div>
        </header>

        <Card className={styles.identityCard}>
          {values.avatarUrl ? (
            <Avatar src={values.avatarUrl} alt={`${values.nickname}的头像`} />
          ) : (
            <div className={styles.avatarFallback} aria-hidden="true">
              {values.nickname.slice(0, 1)}
            </div>
          )}
          <div className={styles.identitySummary}>
            <h2 className={styles.nickname}>{values.nickname}</h2>
            {location && <p className={styles.location}>{location}</p>}
            <span className={styles.visibility}>
              {PROFILE_VISIBILITY_LABELS[values.visibility]}
            </span>
          </div>
        </Card>

        <nav className={styles.sectionList} aria-label="我的功能">
          {ME_SECTIONS.map((section) => (
            <Link
              key={section.href}
              className={styles.sectionLink}
              href={section.href}
            >
              <span className={styles.sectionCopy}>
                <span className={styles.sectionLabel}>{section.label}</span>
                <span className={styles.sectionDescription}>
                  {section.description}
                </span>
              </span>
              <span className={styles.chevron} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </div>
      <BottomNav active="me" />
    </main>
  );
}
