import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthForm } from '@/features/auth/AuthForm';
import { AuthPanel } from '@/features/auth/AuthPanel';

export const metadata: Metadata = {
  title: '注册',
};

export default function RegisterPage() {
  return (
    <AuthPanel
      titleId="auth-title-register"
      title="创建账号"
      description="先留下一封可以寄出的地址。"
      footer={
        <>
          已经有账号？<Link href="/login">登录</Link>
        </>
      }
    >
      <AuthForm mode="register" />
    </AuthPanel>
  );
}
