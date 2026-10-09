import Link from 'next/link';
import { Avatar, Card, Empty, Error } from '@/components/ui';
import type {
  RelationshipLettersPage,
  RelationshipSummary,
} from './types';
import styles from './relationships.module.css';

interface RelationshipDetailViewProps {
  relationship: RelationshipSummary;
  page: RelationshipLettersPage | null;
  errorMessage?: string;
  viewingOlder?: boolean;
}

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
  return [
    relationship.peer.country,
    relationship.peer.city,
    relationship.peer.ageRange,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function RelationshipDetailView({
  relationship,
  page,
  errorMessage,
  viewingOlder = false,
}: RelationshipDetailViewProps) {
  const isActive = relationship.status === 'active';
  const peerMeta = getPeerMeta(relationship);
  const latestHref = `/relationships/${encodeURIComponent(relationship.id)}`;

  return (
    <main className={styles.page}>
      <div className={styles.detailShell}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>F05</p>
            <h1 className={styles.title}>
              和{relationship.peer.nickname}的通信
            </h1>
            <p className={styles.description}>
              从第一封信开始，慢慢写到这里。
            </p>
          </div>
          <Link className={styles.headerAction} href="/relationships">
            我的笔友
          </Link>
        </header>

        <Card className={styles.profileCard}>
          <div className={styles.profileHeader}>
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

            <div className={styles.profileIdentity}>
              <h2 className={styles.peerName}>
                {relationship.peer.nickname}
              </h2>
              {peerMeta && <p className={styles.meta}>{peerMeta}</p>}
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
              <dt>开始通信</dt>
              <dd>{formatDate(relationship.startedAt)}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>最近一封信</dt>
              <dd>
                {relationship.lastLetterAt
                  ? formatDate(relationship.lastLetterAt)
                  : '还没有寄过信'}
              </dd>
            </div>
            <div className={styles.detailItem}>
              <dt>关系状态</dt>
              <dd>
                {isActive
                  ? '通信中'
                  : relationship.endedAt
                    ? `${formatDate(relationship.endedAt)} 结束`
                    : '已结束'}
              </dd>
            </div>
          </dl>
        </Card>

        <section
          className={styles.resultsSection}
          aria-labelledby="letters-title"
        >
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="letters-title" className={styles.sectionTitle}>
                通信记录
              </h2>
              {page && (
                <p className={styles.sectionDescription}>
                  {page.items.length > 0
                    ? `本页显示 ${page.items.length} 封`
                    : '这一页没有信'}
                </p>
              )}
            </div>
          </div>

          {errorMessage ? (
            <div className={styles.errorState}>
              <Error message={errorMessage} />
              <Link className={styles.emptyAction} href={latestHref}>
                回到最新通信记录
              </Link>
            </div>
          ) : page && page.items.length > 0 ? (
            <ul className={styles.letterList}>
              {page.items.map((letter) => {
                const isUnread = !letter.isMine && letter.readAt === null;

                return (
                  <li key={letter.id}>
                    <article className={styles.letterItem}>
                      <div className={styles.letterHeading}>
                        <span
                          className={`${styles.direction} ${
                            letter.isMine
                              ? styles.directionMine
                              : styles.directionReceived
                          }`}
                        >
                          {letter.isMine ? '我寄出' : '收到来信'}
                        </span>
                        {isUnread && (
                          <span className={styles.unread}>未读来信</span>
                        )}
                      </div>
                      <h3 className={styles.letterSubject}>
                        {letter.subject || '无主题的信'}
                      </h3>
                      <time
                        className={styles.letterDate}
                        dateTime={letter.sentAt}
                      >
                        {formatDate(letter.sentAt)}
                      </time>
                    </article>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty
              title={
                viewingOlder
                  ? '没有更早的通信记录'
                  : '还没有通信记录'
              }
              description={
                viewingOlder
                  ? '已经回到最早的记录了。'
                  : '寄出的信会出现在这里。'
              }
              action={
                viewingOlder ? (
                  <Link className={styles.emptyAction} href={latestHref}>
                    回到最新
                  </Link>
                ) : undefined
              }
            />
          )}

          {page && (page.hasMore || viewingOlder) && (
            <nav
              className={styles.pagination}
              aria-label="通信记录分页"
            >
              {viewingOlder && (
                <Link className={styles.paginationLink} href={latestHref}>
                  回到最新
                </Link>
              )}
              {page.hasMore && page.nextCursor && (
                <Link
                  className={styles.paginationLink}
                  href={`${latestHref}?cursor=${encodeURIComponent(
                    page.nextCursor,
                  )}`}
                >
                  看更早的信
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}
