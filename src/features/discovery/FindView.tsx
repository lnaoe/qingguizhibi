import Link from 'next/link';
import { Avatar, Button, Card, Empty, Error, Input, Tag } from '@/components/ui';
import {
  AGE_RANGE_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
} from '../onboarding/options';
import type { DiscoveryCriteria, DiscoveryPage, DiscoveryPenpal } from './types';
import styles from './find.module.css';

interface FindViewProps {
  criteria: DiscoveryCriteria | null;
  page: DiscoveryPage | null;
  errorMessage?: string;
}

function getProfileLocation(penpal: DiscoveryPenpal): string {
  return [penpal.country, penpal.city].filter(Boolean).join(' · ');
}

function PenpalResult({ penpal }: { penpal: DiscoveryPenpal }) {
  const location = getProfileLocation(penpal);

  return (
    <Link
      className={styles.penpalCardLink}
      href={`/penpals/${penpal.id}`}
      aria-label={`查看${penpal.nickname}的笔友详情`}
    >
      <Card className={styles.penpalCard}>
        <div className={styles.penpalHeader}>
          {penpal.avatarUrl ? (
            <Avatar
              src={penpal.avatarUrl}
              alt={`${penpal.nickname}的头像`}
            />
          ) : (
            <div className={styles.avatarFallback} aria-hidden="true">
              {penpal.nickname.slice(0, 1)}
            </div>
          )}

          <div className={styles.penpalSummary}>
            <h3 className={styles.nickname}>{penpal.nickname}</h3>
            <p className={styles.meta}>
              {location}
              {location && penpal.ageRange ? ' · ' : ''}
              {penpal.ageRange}
            </p>
          </div>
        </div>

        {penpal.interests.length > 0 && (
          <div className={styles.tagList}>
            {penpal.interests.slice(0, 5).map((interest) => (
              <Tag key={interest.id}>{interest.name}</Tag>
            ))}
          </div>
        )}

        {penpal.languages.length > 0 && (
          <p className={styles.languages}>
            语言：{penpal.languages.join('、')}
          </p>
        )}
      </Card>
    </Link>
  );
}

export function FindView({ criteria, page, errorMessage }: FindViewProps) {
  const recommend = criteria?.recommend ?? true;
  const selectedInterestIds = new Set(criteria?.interestIds ?? []);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>D01</p>
            <h1 className={styles.title}>找笔友</h1>
            <p className={styles.description}>
              用一点条件，找到愿意慢慢写信的人。
            </p>
          </div>
          <Link className={styles.headerAction} href="/">
            返回首页
          </Link>
        </header>

        <Card className={styles.filterCard}>
          <form
            id="filters"
            className={styles.filters}
            action="/find"
            method="get"
            aria-label="筛选笔友"
          >
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>排序</legend>
              <div className={styles.segmentedControl}>
                <label className={styles.segment}>
                  <input
                    type="radio"
                    name="recommend"
                    value="true"
                    defaultChecked={recommend}
                  />
                  <span>为你推荐</span>
                </label>
                <label className={styles.segment}>
                  <input
                    type="radio"
                    name="recommend"
                    value="false"
                    defaultChecked={!recommend}
                  />
                  <span>按加入顺序</span>
                </label>
              </div>
            </fieldset>

            <div className={styles.filterGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="find-age-range">
                  年龄段
                </label>
                <select
                  id="find-age-range"
                  className={styles.select}
                  name="age_range"
                  defaultValue={criteria?.ageRange ?? ''}
                >
                  <option value="">不限</option>
                  {AGE_RANGE_OPTIONS.map((ageRange) => (
                    <option key={ageRange} value={ageRange}>
                      {ageRange}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="find-language">
                  语言
                </label>
                <select
                  id="find-language"
                  className={styles.select}
                  name="language"
                  defaultValue={criteria?.language ?? ''}
                >
                  <option value="">不限</option>
                  {LANGUAGE_OPTIONS.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="find-country">
                  国家/地区
                </label>
                <Input
                  id="find-country"
                  name="country"
                  maxLength={50}
                  defaultValue={criteria?.country ?? ''}
                  placeholder="例如：中国"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="find-city">
                  城市
                </label>
                <Input
                  id="find-city"
                  name="city"
                  maxLength={50}
                  defaultValue={criteria?.city ?? ''}
                  placeholder="例如：杭州"
                />
              </div>
            </div>

            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>兴趣</legend>
              <div className={styles.interestGrid}>
                {INTEREST_OPTIONS.map((interest) => (
                  <label key={interest.id} className={styles.interestChoice}>
                    <input
                      type="checkbox"
                      name="interest_ids"
                      value={interest.id}
                      defaultChecked={selectedInterestIds.has(interest.id)}
                    />
                    <span>{interest.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={styles.filterActions}>
              <Link className={styles.resetLink} href="/find">
                清除筛选
              </Link>
              <Button className={styles.submitButton} type="submit">
                更新列表
              </Button>
            </div>
          </form>
        </Card>

        <section className={styles.resultsSection} aria-labelledby="results-title">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="results-title" className={styles.sectionTitle}>
                遇见的人
              </h2>
              {page && (
                <p className={styles.sectionDescription}>
                  {page.items.length > 0
                    ? `当前显示 ${page.items.length} 位`
                    : '没有找到符合条件的人'}
                </p>
              )}
            </div>
          </div>

          {errorMessage ? (
            <div className={styles.errorState}>
              <Error message={errorMessage} />
              <Link className={styles.resetLink} href="/find">
                重新开始查找
              </Link>
            </div>
          ) : page && page.items.length > 0 ? (
            <ul className={styles.resultsList}>
              {page.items.map((penpal) => (
                <li key={penpal.id}>
                  <PenpalResult penpal={penpal} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title="暂时没有遇见合适的人"
              description="换一组筛选条件，或稍后再来看看。"
              action={
                <a className={styles.emptyAction} href="#filters">
                  调整筛选
                </a>
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}
