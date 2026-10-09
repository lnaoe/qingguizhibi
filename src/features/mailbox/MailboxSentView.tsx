import Link from 'next/link';
import { Avatar, Empty, Error } from '@/components/ui';
import { formatLetterDate } from './format';
import { MailboxTabs } from './MailboxTabs';
import type { MailboxCriteria, SentPage } from './types';
import styles from './mailbox.module.css';

interface MailboxSentViewProps {
  criteria: MailboxCriteria | null;
  page: SentPage | null;
  errorMessage?: string;
}

export function MailboxSentView({
  criteria,
  page,
  errorMessage,
}: MailboxSentViewProps) {
  const hasCursor = criteria?.cursor !== null && criteria?.cursor !== undefined;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>E01</p>
            <h1 className={styles.title}>信箱</h1>
            <p className={styles.description}>
              看看那些已经寄出的信，慢慢等待回音。
            </p>
          </div>
          <Link className={styles.headerAction} href="/">
            返回首页
          </Link>
        </header>

        <MailboxTabs active="sent" />

        <section className={styles.section} aria-labelledby="sent-title">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="sent-title" className={styles.sectionTitle}>
                寄出
              </h2>
              {page && (
                <p className={styles.sectionDescription}>
                  {page.items.length > 0
                    ? `这一页有 ${page.items.length} 封寄出的信`
                    : '还没有寄出的信'}
                </p>
              )}
            </div>
          </div>

          {errorMessage ? (
            <div className={styles.errorState}>
              <Error message={errorMessage} />
              <Link className={styles.headerAction} href="/mailbox/sent">
                打开最新寄出
              </Link>
            </div>
          ) : page && page.items.length > 0 ? (
            <ul className={styles.letterList}>
              {page.items.map((letter) => (
                <li key={letter.id} className={styles.letterItem}>
                  <Link
                    className={styles.letterLink}
                    href={`/letters/${letter.id}`}
                  >
                    {letter.recipientAvatarUrl ? (
                      <Avatar
                        className={styles.letterAvatar}
                        src={letter.recipientAvatarUrl}
                        alt={`${letter.recipientNickname}的头像`}
                      />
                    ) : (
                      <div
                        className={styles.letterAvatarFallback}
                        aria-hidden="true"
                      >
                        {letter.recipientNickname.slice(0, 1)}
                      </div>
                    )}

                    <article className={styles.letterContent}>
                      <div className={styles.letterHeading}>
                        <h3 className={styles.letterSender}>
                          {letter.recipientNickname}
                        </h3>
                      </div>
                      <p className={styles.letterSubject}>
                        {letter.subject || '无主题的信'}
                      </p>
                      <time
                        className={styles.letterDate}
                        dateTime={letter.sentAt}
                      >
                        {formatLetterDate(letter.sentAt)}
                      </time>
                    </article>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title="还没有寄出的信"
              description="寄出的信会在这里留下记录。"
              action={
                <Link className={styles.emptyAction} href="/find">
                  去找笔友
                </Link>
              }
            />
          )}

          {page && (hasCursor || page.nextCursor) && (
            <nav className={styles.pagination} aria-label="寄出分页">
              {hasCursor && (
                <Link className={styles.paginationLink} href="/mailbox/sent">
                  返回最新
                </Link>
              )}
              {page.nextCursor && (
                <Link
                  className={styles.paginationLink}
                  href={`/mailbox/sent?cursor=${encodeURIComponent(page.nextCursor)}`}
                  rel="next"
                >
                  下一页
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}
