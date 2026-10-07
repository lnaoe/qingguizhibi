import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { HomeView } from '@/features/home/HomeView';
import { getHomeSnapshot } from '@/features/home/service';
import { getOnboardingSnapshot } from '@/features/onboarding/service';
import { getCurrentUser } from '@/lib/auth';
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: '首页',
};

export default async function Home() {
  const user = await getCurrentUser(await headers());

  if (user) {
    const onboarding = getOnboardingSnapshot(db, user.id);

    if (!onboarding.onboardingCompleted) {
      redirect('/onboarding');
    }

    const snapshot = getHomeSnapshot(db, user.id);

    return (
      <HomeView
        nickname={onboarding.values.nickname}
        todayEncounters={snapshot.todayEncounters}
        recentLetters={snapshot.recentLetters}
      />
    );
  }

  return (
    <main className={styles.main}>
      <section className={styles.intro}>
        <h1>情归纸笔</h1>
        <p>写一封信，认识一个人</p>
        <div className={styles.actions}>
          <Link className={styles.primaryAction} href="/register">
            开始写信
          </Link>
          <Link className={styles.secondaryAction} href="/login">
            已有账号，登录
          </Link>
        </div>
      </section>
    </main>
  );
}
