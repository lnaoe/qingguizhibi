import Link from 'next/link';
import { Avatar, Empty, Error } from '@/components/ui';
import { formatLetterDate } from './format';
import { MailboxTabs } from './MailboxTabs';
import type { InboxPage, MailboxCriteria } from './types';
import styles from './mailbox.module.css';

interface MailboxInboxViewProps {
  criteria: MailboxCriteria | null;
  page: InboxPage | null;
  errorMessage?: string;
}

export function MailboxInboxView({
  criteria,
  page,
  errorMessage,
}: MailboxInboxViewProps) {
  const hasCursor = criteria?.cursor !== null && criteria?.cursor !== undefined;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>E01</p>
            <h1 className={styles.title}>信箱</h1>
            <p className={styles.description}>
              慢慢读每一封寄来的信，不急着回。
            </p>
          </div>
          <Link className={styles.headerAction} href="/">
            返回首页
          </Link>
        </header>

        <MailboxTabs active="inbox" />

        <section className={styles.section} aria-labelledby="inbox-title">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="inbox-title" className={styles.sectionTitle}>
                来信
              </h2>
              {page && (
                <p className={styles.sectionDescription}>
                  {page.items.length > 0
                    ? `这一页有 ${page.items.length} 封来信`
                    : '还没有收到来信'}
                </p>
              )}
            </div>
          </div>

          {errorMessage ? (
            <div className={styles.errorState}>
              <Error message={errorMessage} />
              <Link className={styles.headerAction} href="/mailbox">
                打开最新来信
              </Link>
            </div>
          ) : page && page.items.length > 0 ? (
            <ul className={styles.letterList}>
              {page.items.map((letter) => (
                <li
                  key={letter.id}
                  className={`${styles.letterItem} ${
                    letter.isUnread ? styles.unreadItem : ''
                  }`}
                >
                  <Link
                    className={styles.letterLink}
                    href={`/letters/${letter.id}`}
                  >
                    {letter.senderAvatarUrl ? (
                      <Avatar
                        className={styles.letterAvatar}
                        src={letter.senderAvatarUrl}
                        alt={`${letter.senderNickname}的头像`}
                      />
                    ) : (
                      <div
                        className={styles.letterAvatarFallback}
                        aria-hidden="true"
                      >
                        {letter.senderNickname.slice(0, 1)}
                      </div>
                    )}

                    <article className={styles.letterContent}>
                      <div className={styles.letterHeading}>
                        <h3 className={styles.letterSender}>
                          {letter.senderNickname}
                        </h3>
                        {letter.isUnread && (
                          <span className={styles.unread}>未读</span>
                        )}
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
              title="信箱还很安静"
              description="当有人给你寄来第一封信，它会出现在这里。"
              action={
                <Link className={styles.emptyAction} href="/find">
                  去找笔友
                </Link>
              }
            />
          )}

          {page && (hasCursor || page.nextCursor) && (
            <nav className={styles.pagination} aria-label="来信分页">
              {hasCursor && (
                <Link className={styles.paginationLink} href="/mailbox">
                  返回最新
                </Link>
              )}
              {page.nextCursor && (
                <Link
                  className={styles.paginationLink}
                  href={`/mailbox?cursor=${encodeURIComponent(page.nextCursor)}`}
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
