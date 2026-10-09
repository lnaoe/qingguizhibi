'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { authClient } from '@/lib/auth-client';
import styles from './settings.module.css';

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setError(null);
    setIsSigningOut(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setError('退出登录失败，请稍后重试。');
        return;
      }

      router.replace('/login');
      router.refresh();
    } catch {
      setError('退出登录失败，请稍后重试。');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className={styles.signOutAction}>
      <Button
        className={styles.signOutButton}
        variant="secondary"
        type="button"
        disabled={isSigningOut}
        onClick={handleSignOut}
      >
        {isSigningOut ? '正在退出...' : '退出登录'}
      </Button>
      {error && (
        <p className={styles.signOutError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
