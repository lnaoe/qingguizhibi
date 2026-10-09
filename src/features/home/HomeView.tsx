import { Avatar, BottomNav, Card, Empty, Tag } from '@/components/ui';
import Link from 'next/link';
import type { DiscoveryPenpal } from '../discovery/types';
import type { HomeRecentLetter } from './types';
import styles from './home.module.css';

interface HomeViewProps {
  nickname: string;
  todayEncounters: DiscoveryPenpal[];
  recentLetters: HomeRecentLetter[];
  unreadNotificationCount: number;
}

function formatLetterDate(value: string): string {
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

function getProfileLocation(penpal: DiscoveryPenpal): string {
  return [penpal.country, penpal.city].filter(Boolean).join(' · ');
}

export function HomeView({
  nickname,
  todayEncounters,
  recentLetters,
  unreadNotificationCount,
}: HomeViewProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>首页</p>
            <h1 className={styles.title}>今天</h1>
            <p className={styles.description}>
              {nickname}，今天也可以慢慢认识一个人。
            </p>
          </div>
          <div className={styles.headerActions}>
            <Link className={styles.notificationLink} href="/notifications">
              <span>通知</span>
              {unreadNotificationCount > 0 && (
                <span
                  className={styles.notificationCount}
                  aria-label={`${unreadNotificationCount} 条未读通知`}
                >
                  {unreadNotificationCount}
                </span>
              )}
            </Link>
            <Link className={styles.findLink} href="/find">
              去找笔友
            </Link>
          </div>
        </header>

        <div className={styles.content}>
          <section
            id="today"
            className={styles.section}
            aria-labelledby="today-title"
          >
            <div className={styles.sectionHeader}>
              <h2 id="today-title" className={styles.sectionTitle}>
                今日遇见
              </h2>
              <p className={styles.sectionDescription}>
                为你找到 {todayEncounters.length} 位可能聊得来的人
              </p>
            </div>

            {todayEncounters.length === 0 ? (
              <Empty
                title="今天还没有新的遇见"
                description="先看看最近有没有来信，过一会儿再来看看。"
                action={
                  <a className={styles.emptyAction} href="#letters">
                    看看最近来信
                  </a>
                }
              />
            ) : (
              <div className={styles.encounterGrid}>
                {todayEncounters.map((penpal) => (
                  <Link
                    key={penpal.id}
                    className={styles.encounterCardLink}
                    href={`/penpals/${penpal.id}`}
                    aria-label={`查看${penpal.nickname}的笔友详情`}
                  >
                    <Card className={styles.encounterCard}>
                      <div className={styles.encounterHeader}>
                        {penpal.avatarUrl ? (
                          <Avatar
                            src={penpal.avatarUrl}
                            alt={`${penpal.nickname}的头像`}
                          />
                        ) : (
                          <div
                            className={styles.avatarFallback}
                            aria-hidden="true"
                          >
                            {penpal.nickname.slice(0, 1)}
                          </div>
                        )}

                        <div className={styles.encounterSummary}>
                          <h3 className={styles.nickname}>
                            {penpal.nickname}
                          </h3>
                          <p className={styles.meta}>
                            {getProfileLocation(penpal)}
                            {getProfileLocation(penpal) && penpal.ageRange
                              ? ' · '
                              : ''}
                            {penpal.ageRange}
                          </p>
                        </div>
                      </div>

                      <div className={styles.tagList}>
                        {penpal.interests.slice(0, 3).map((interest) => (
                          <Tag key={interest.id}>{interest.name}</Tag>
                        ))}
                      </div>

                      {penpal.languages.length > 0 && (
                        <p className={styles.languages}>
                          {penpal.languages.join('、')}
                        </p>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section
            id="letters"
            className={styles.section}
            aria-labelledby="letters-title"
          >
            <div className={styles.sectionHeader}>
              <h2 id="letters-title" className={styles.sectionTitle}>
                最近来信
              </h2>
              <p className={styles.sectionDescription}>
                安静地等你打开的信
              </p>
            </div>

            {recentLetters.length === 0 ? (
              <Empty
                title="信箱还很安静"
                description="当有人给你寄来第一封信，它会出现在这里。"
                action={
                  <a className={styles.emptyAction} href="#today">
                    看看今日遇见
                  </a>
                }
              />
            ) : (
              <div className={styles.letterList}>
                {recentLetters.map((letter) => (
                  <Link
                    key={letter.id}
                    className={styles.letterItem}
                    href={`/letters/${encodeURIComponent(letter.id)}`}
                    aria-label={`打开${letter.senderNickname}寄来的信`}
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

                    <div className={styles.letterContent}>
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
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <BottomNav active="home" />
    </main>
  );
}
