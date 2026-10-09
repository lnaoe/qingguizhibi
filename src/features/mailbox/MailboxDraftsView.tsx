import Link from 'next/link';
import { Avatar, BottomNav, Empty, Error } from '@/components/ui';
import { formatLetterDate } from './format';
import { MailboxTabs } from './MailboxTabs';
import type { DraftPage, MailboxCriteria } from './types';
import styles from './mailbox.module.css';

interface MailboxDraftsViewProps {
  criteria: MailboxCriteria | null;
  page: DraftPage | null;
  errorMessage?: string;
}

export function MailboxDraftsView({
  criteria,
  page,
  errorMessage,
}: MailboxDraftsViewProps) {
  const hasCursor = criteria?.cursor !== null && criteria?.cursor !== undefined;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <h1 className={styles.title}>信箱</h1>
            <p className={styles.description}>
              还没寄出的想法，可以在这里慢慢写完。
            </p>
          </div>
          <Link className={styles.headerAction} href="/">
            返回首页
          </Link>
        </header>

        <MailboxTabs active="drafts" />

        <section className={styles.section} aria-labelledby="drafts-title">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="drafts-title" className={styles.sectionTitle}>
                草稿
              </h2>
              {page && (
                <p className={styles.sectionDescription}>
                  {page.items.length > 0
                    ? `这一页有 ${page.items.length} 封草稿`
                    : '还没有草稿'}
                </p>
              )}
            </div>
          </div>

          {errorMessage ? (
            <div className={styles.errorState}>
              <Error message={errorMessage} />
              <Link className={styles.headerAction} href="/mailbox/drafts">
                打开最新草稿
              </Link>
            </div>
          ) : page && page.items.length > 0 ? (
            <ul className={styles.letterList}>
              {page.items.map((letter) => (
                <li key={letter.id} className={styles.letterItem}>
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
                      <span className={styles.draftBadge}>草稿</span>
                    </div>
                    <p className={styles.letterSubject}>
                      {letter.subject || '无主题草稿'}
                    </p>
                    <time
                      className={styles.letterDate}
                      dateTime={letter.updatedAt}
                    >
                      上次保存于 {formatLetterDate(letter.updatedAt)}
                    </time>
                    <Link
                      className={styles.editDraftLink}
                      href={`/mailbox/drafts/${encodeURIComponent(letter.id)}/edit`}
                      aria-label={`继续编辑给${letter.recipientNickname}的草稿`}
                    >
                      继续编辑
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title="还没有草稿"
              description="写信时保存的草稿会出现在这里。"
              action={
                <Link className={styles.emptyAction} href="/mailbox">
                  去看看来信
                </Link>
              }
            />
          )}

          {page && (hasCursor || page.nextCursor) && (
            <nav className={styles.pagination} aria-label="草稿分页">
              {hasCursor && (
                <Link
                  className={styles.paginationLink}
                  href="/mailbox/drafts"
                >
                  返回最新
                </Link>
              )}
              {page.nextCursor && (
                <Link
                  className={styles.paginationLink}
                  href={`/mailbox/drafts?cursor=${encodeURIComponent(page.nextCursor)}`}
                  rel="next"
                >
                  下一页
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
      <BottomNav active="mailbox" />
    </main>
  );
}
