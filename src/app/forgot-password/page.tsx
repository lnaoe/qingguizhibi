import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm';
import { AuthPanel } from '@/features/auth/AuthPanel';

export const metadata: Metadata = {
  title: '找回密码',
};

export default function ForgotPasswordPage() {
  return (
    <AuthPanel
      titleId="auth-title-forgot-password"
      title="找回密码"
      description="输入注册邮箱，我们会发送一封重置邮件。"
      footer={<Link href="/login">返回登录</Link>}
    >
      <ForgotPasswordForm />
    </AuthPanel>
  );
}
