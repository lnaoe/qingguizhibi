import Link from 'next/link';
import { Avatar, Card, Empty, Error } from '@/components/ui';
import type {
  RelationshipCriteria,
  RelationshipPage,
  RelationshipSummary,
} from './types';
import styles from './relationships.module.css';

interface RelationshipsViewProps {
  criteria: RelationshipCriteria | null;
  page: RelationshipPage | null;
  errorMessage?: string;
}

const STATUS_FILTERS = [
  { value: null, label: '全部', href: '/relationships' },
  { value: 'active', label: '通信中', href: '/relationships?status=active' },
  { value: 'ended', label: '已结束', href: '/relationships?status=ended' },
] as const;

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const currentYear = new Date().getFullYear();
  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === currentYear
      ? { month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'long', day: 'numeric' };

  return new Intl.DateTimeFormat('zh-CN', options).format(date);
}

function getPeerMeta(relationship: RelationshipSummary): string {
  return [relationship.peer.country, relationship.peer.city]
    .filter(Boolean)
    .join(' · ');
}

function RelationshipItem({
  relationship,
}: {
  relationship: RelationshipSummary;
}) {
  const location = getPeerMeta(relationship);
  const isActive = relationship.status === 'active';

  return (
    <Link
      className={styles.itemLink}
      href={`/relationships/${relationship.id}`}
      aria-label={`查看与${relationship.peer.nickname}的通信记录`}
    >
      <Card className={styles.itemCard}>
        <div className={styles.itemHeader}>
          {relationship.peer.avatarUrl ? (
            <Avatar
              src={relationship.peer.avatarUrl}
              alt={`${relationship.peer.nickname}的头像`}
            />
          ) : (
            <div className={styles.avatarFallback} aria-hidden="true">
              {relationship.peer.nickname.slice(0, 1)}
            </div>
          )}

          <div className={styles.itemSummary}>
            <h3 className={styles.nickname}>
              {relationship.peer.nickname}
            </h3>
            {location && <p className={styles.meta}>{location}</p>}
          </div>

          <span
            className={`${styles.status} ${
              isActive ? styles.statusActive : styles.statusEnded
            }`}
          >
            {isActive ? '通信中' : '已结束'}
          </span>
        </div>

        <dl className={styles.details}>
          <div className={styles.detailItem}>
            <dt>最近一封信</dt>
            <dd>
              {relationship.lastLetterAt
                ? formatDate(relationship.lastLetterAt)
                : '还没有寄过信'}
            </dd>
          </div>
          <div className={styles.detailItem}>
            <dt>开始通信</dt>
            <dd>{formatDate(relationship.startedAt)}</dd>
          </div>
        </dl>
      </Card>
    </Link>
  );
}

export function RelationshipsView({
  criteria,
  page,
  errorMessage,
}: RelationshipsViewProps) {
  const activeStatus = criteria?.status ?? null;
  const sectionTitle =
    activeStatus === 'active'
      ? '通信中的笔友'
      : activeStatus === 'ended'
        ? '已结束的通信'
        : '全部笔友';

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>F04</p>
            <h1 className={styles.title}>我的笔友</h1>
            <p className={styles.description}>
              和还在通信的人，慢慢写下去。
            </p>
          </div>
          <Link className={styles.headerAction} href="/">
            返回首页
          </Link>
        </header>

        <nav className={styles.filters} aria-label="按通信状态筛选">
          {STATUS_FILTERS.map((filter) => (
            <Link
              key={filter.label}
              className={`${styles.filterLink} ${
                activeStatus === filter.value ? styles.filterLinkActive : ''
              }`}
              href={filter.href}
              aria-current={activeStatus === filter.value ? 'page' : undefined}
            >
              {filter.label}
            </Link>
          ))}
        </nav>

        <section className={styles.resultsSection} aria-labelledby="penpals-title">
          <div className={styles.sectionHeader}>
            <h2 id="penpals-title" className={styles.sectionTitle}>
              {sectionTitle}
            </h2>
            {page && (
              <p className={styles.sectionDescription}>
                {page.items.length > 0
                  ? `当前显示 ${page.items.length} 位`
                  : '这里还没有人'}
              </p>
            )}
          </div>

          {errorMessage ? (
            <div className={styles.errorState}>
              <Error message={errorMessage} />
              <Link className={styles.emptyAction} href="/relationships">
                重新加载
              </Link>
            </div>
          ) : page && page.items.length > 0 ? (
            <ul className={styles.itemList}>
              {page.items.map((relationship) => (
                <li key={relationship.id}>
                  <RelationshipItem relationship={relationship} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title="还没有笔友"
              description="当有人回应你的第一封信，这里会出现你们的关系。"
              action={
                <Link className={styles.emptyAction} href="/find">
                  去找笔友
                </Link>
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}
