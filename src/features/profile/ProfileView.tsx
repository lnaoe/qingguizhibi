import Link from 'next/link';
import { Avatar, Card, Tag } from '@/components/ui';
import { PROFILE_VISIBILITY_LABELS } from './options';
import type { ProfileSnapshot } from './types';
import styles from './profile.module.css';

interface ProfileViewProps {
  snapshot: ProfileSnapshot;
}

export function ProfileView({ snapshot }: ProfileViewProps) {
  const { values, interests } = snapshot;
  const location = [values.country, values.city].filter(Boolean).join(' · ');

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>我的资料</h1>
          </div>
          <Link className={styles.primaryLink} href="/profile/edit">
            编辑资料
          </Link>
        </header>

        <Card className={styles.profileCard}>
          <div className={styles.profileHeading}>
            {values.avatarUrl ? (
              <Avatar src={values.avatarUrl} alt={`${values.nickname}的头像`} />
            ) : (
              <div className={styles.avatarFallback} aria-hidden="true">
                {values.nickname.slice(0, 1)}
              </div>
            )}
            <div className={styles.profileSummary}>
              <h2 className={styles.nickname}>{values.nickname}</h2>
              {location && <p className={styles.location}>{location}</p>}
              <span className={styles.visibility}>
                {PROFILE_VISIBILITY_LABELS[values.visibility]}
              </span>
            </div>
          </div>

          <dl className={styles.details}>
            <div className={styles.detailItem}>
              <dt>年龄段</dt>
              <dd>{values.ageRange}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>语言</dt>
              <dd>{values.languages.join('、')}</dd>
            </div>
          </dl>
        </Card>

        <section className={styles.section} aria-labelledby="profile-about">
          <h2 id="profile-about" className={styles.sectionTitle}>
            关于我
          </h2>
          <p className={styles.bodyText}>{values.bio}</p>
        </section>

        <section className={styles.section} aria-labelledby="profile-interests">
          <h2 id="profile-interests" className={styles.sectionTitle}>
            兴趣
          </h2>
          <div className={styles.tagList}>
            {interests.map((interest) => (
              <Tag key={interest.id}>{interest.name}</Tag>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="profile-reasons">
          <h2 id="profile-reasons" className={styles.sectionTitle}>
            为什么想找笔友
          </h2>
          <ul className={styles.reasonList}>
            {values.penpalReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>

        <Link className={styles.secondaryLink} href="/my">
          返回我的
        </Link>
      </div>
    </main>
  );
}
