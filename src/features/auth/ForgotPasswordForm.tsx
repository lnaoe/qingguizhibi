'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { authClient } from '@/lib/auth-client';
import {
  getAuthErrorMessage,
  validatePasswordResetRequest,
  type PasswordResetRequestErrors,
} from './validation';
import styles from './auth.module.css';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<PasswordResetRequestErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validatePasswordResetRequest({ email });
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: '/reset-password',
      });

      if (result.error) {
        setFormError(
          getAuthErrorMessage(
            result.error,
            '重置邮件发送失败，请稍后重试。',
          ),
        );
        return;
      }

      setIsSent(true);
    } catch (error) {
      setFormError(
        getAuthErrorMessage(error, '重置邮件发送失败，请稍后重试。'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <div className={styles.status} role="status">
        <p className={styles.statusTitle}>请检查你的邮箱</p>
        <p className={styles.statusText}>
          如果该邮箱已经注册，你会收到一封包含重置链接的邮件。请同时检查垃圾邮件。
        </p>
        <Link className={styles.inlineLink} href="/login">
          返回登录
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="forgot-password-email">
          邮箱
        </label>
        <Input
          id="forgot-password-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={
            errors.email ? 'forgot-password-email-error' : undefined
          }
          onChange={(event) => {
            setEmail(event.target.value);
            setErrors({});
            setFormError(null);
          }}
        />
        {errors.email && (
          <p id="forgot-password-email-error" className={styles.fieldError}>
            {errors.email}
          </p>
        )}
      </div>

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <Button
        className={styles.submit}
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? '正在发送...' : '发送重置'}
      </Button>
    </form>
  );
}
