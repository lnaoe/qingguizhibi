import Link from 'next/link';
import { Avatar, Card, Tag } from '@/components/ui';
import type { PublicPenpalProfile } from './types';
import styles from './penpal.module.css';

interface PenpalDetailViewProps {
  profile: PublicPenpalProfile;
  canWrite: boolean;
}

export function PenpalDetailView({
  profile,
  canWrite,
}: PenpalDetailViewProps) {
  const location = [profile.country, profile.city]
    .filter(Boolean)
    .join(' · ');
  const meta = [location, profile.ageRange].filter(Boolean).join(' · ');

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/find">
          返回找笔友
        </Link>

        <Card className={styles.profileCard}>
          <div className={styles.profileHeader}>
            {profile.avatarUrl ? (
              <Avatar
                src={profile.avatarUrl}
                alt={`${profile.nickname}的头像`}
              />
            ) : (
              <div className={styles.avatarFallback} aria-hidden="true">
                {profile.nickname.slice(0, 1)}
              </div>
            )}

            <div className={styles.profileSummary}>
              <p className={styles.eyebrow}>笔友详情</p>
              <h1 className={styles.title}>{profile.nickname}</h1>
              {meta && <p className={styles.meta}>{meta}</p>}
            </div>
          </div>

          <dl className={styles.details}>
            <div className={styles.detailItem}>
              <dt>语言</dt>
              <dd>{profile.languages.join('、') || '未填写'}</dd>
            </div>
          </dl>

          {canWrite && (
            <Link
              className={styles.primaryLink}
              href={`/penpals/${profile.id}/write`}
            >
              写第一封信
            </Link>
          )}
        </Card>

        <section className={styles.section} aria-labelledby="detail-about">
          <h2 id="detail-about" className={styles.sectionTitle}>
            关于我
          </h2>
          <p className={styles.bodyText}>
            {profile.bio || '这个人还没有写下自我介绍。'}
          </p>
        </section>

        <section
          className={styles.section}
          aria-labelledby="detail-interests"
        >
          <h2 id="detail-interests" className={styles.sectionTitle}>
            兴趣
          </h2>
          {profile.interests.length > 0 ? (
            <div className={styles.tagList}>
              {profile.interests.map((interest) => (
                <Tag key={interest.id}>{interest.name}</Tag>
              ))}
            </div>
          ) : (
            <p className={styles.bodyText}>还没有选择兴趣。</p>
          )}
        </section>

        <section className={styles.section} aria-labelledby="detail-reasons">
          <h2 id="detail-reasons" className={styles.sectionTitle}>
            为什么想找笔友
          </h2>
          {profile.penpalReasons.length > 0 ? (
            <ul className={styles.reasonList}>
              {profile.penpalReasons.map((reason) => (
                <li key={reason} className={styles.reasonItem}>
                  {reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.bodyText}>还没有写下找笔友的原因。</p>
          )}
        </section>
      </div>
    </main>
  );
}
