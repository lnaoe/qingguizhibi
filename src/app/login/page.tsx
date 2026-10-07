import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthForm } from '@/features/auth/AuthForm';
import { AuthPanel } from '@/features/auth/AuthPanel';

export const metadata: Metadata = {
  title: '登录',
};

export default function LoginPage() {
  return (
    <AuthPanel
      titleId="auth-title-login"
      title="登录"
      description="回到你的信箱，继续读信和写信。"
      footer={
        <>
          <p>
            忘记密码？<Link href="/forgot-password">找回密码</Link>
          </p>
          <p>
            还没有账号？<Link href="/register">创建账号</Link>
          </p>
        </>
      }
    >
      <AuthForm mode="login" />
    </AuthPanel>
  );
}
