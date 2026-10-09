import Link from 'next/link';
import { Avatar, Card } from '@/components/ui';
import { formatLetterDate } from '../mailbox/format';
import type { LetterDetailRecord } from './types';
import styles from './letter.module.css';

interface LetterDetailViewProps {
  letter: LetterDetailRecord;
  currentUserId: string;
}

export function LetterDetailView({
  letter,
  currentUserId,
}: LetterDetailViewProps) {
  const isSender = letter.sender.id === currentUserId;
  const sentAt = letter.sentAt ?? letter.createdAt;
  const backHref = isSender ? '/mailbox/sent' : '/mailbox';
  const backLabel = isSender ? '返回寄出' : '返回信箱';
  const canReply =
    letter.recipient.id === currentUserId &&
    letter.replyRelationshipId !== null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href={backHref}>
          {backLabel}
        </Link>

        <header className={styles.detailHeader}>
          <h1 className={styles.detailTitle}>
            {letter.subject || '无主题的信'}
          </h1>
        </header>

        <Card className={styles.letterCard}>
          <div className={styles.letterMeta}>
            <div className={styles.senderSummary}>
              {letter.sender.avatarUrl ? (
                <Avatar
                  src={letter.sender.avatarUrl}
                  alt={`${letter.sender.nickname}的头像`}
                />
              ) : (
                <div className={styles.avatarFallback} aria-hidden="true">
                  {letter.sender.nickname.slice(0, 1)}
                </div>
              )}

              <div className={styles.senderCopy}>
                <p className={styles.senderLabel}>发信人</p>
                <p className={styles.senderName}>{letter.sender.nickname}</p>
              </div>
            </div>

            <div className={styles.dateBlock}>
              <p className={styles.dateLabel}>寄出日期</p>
              <time
                className={styles.detailDate}
                dateTime={sentAt.toISOString()}
              >
                {formatLetterDate(sentAt.toISOString())}
              </time>
            </div>
          </div>

          <div className={styles.letterRule} />

          <article
            className={styles.letterBody}
            aria-label="信件正文"
          >
            <p className={styles.letterBodyText}>{letter.body}</p>
          </article>
        </Card>

        {canReply && (
          <div className={styles.detailActions}>
            <Link
              className={styles.replyAction}
              href={`/letters/${letter.id}/reply`}
            >
              回信
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
