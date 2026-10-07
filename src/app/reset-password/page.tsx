import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthPanel } from '@/features/auth/AuthPanel';
import { ResetPasswordForm } from '@/features/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: '重置密码',
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    token?: string | string[];
  }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token =
    typeof params.token === 'string' ? params.token.trim() : undefined;

  return (
    <AuthPanel
      titleId="auth-title-reset-password"
      title="重置密码"
      description="设置一个新密码，继续你的通信。"
      footer={<Link href="/login">返回登录</Link>}
    >
      <ResetPasswordForm token={token || undefined} />
    </AuthPanel>
  );
}
