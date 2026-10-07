'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { authClient } from '@/lib/auth-client';
import {
  getAuthErrorMessage,
  validateNewPassword,
  type NewPasswordErrors,
} from './validation';
import styles from './auth.module.css';

interface ResetPasswordFormProps {
  token?: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<NewPasswordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  function clearError(field: keyof NewPasswordErrors) {
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      return { ...current, [field]: undefined };
    });
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    const nextErrors = validateNewPassword({
      password,
      confirmPassword,
    });
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        setFormError(
          getAuthErrorMessage(result.error, '密码重置失败，请稍后重试。'),
        );
        return;
      }

      setIsComplete(true);
    } catch (error) {
      setFormError(
        getAuthErrorMessage(error, '密码重置失败，请稍后重试。'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className={styles.status} role="alert">
        <p className={styles.statusTitle}>重置链接无效</p>
        <p className={styles.statusText}>
          这个链接缺少必要信息，或者已经过期。请重新申请一封重置邮件。
        </p>
        <Link className={styles.inlineLink} href="/forgot-password">
          重新申请
        </Link>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className={styles.status} role="status">
        <p className={styles.statusTitle}>密码已重置</p>
        <p className={styles.statusText}>
          现在可以使用新密码登录，继续你的通信。
        </p>
        <Link className={styles.inlineLink} href="/login">
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="reset-password">
          新密码
        </label>
        <Input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password ? 'reset-password-error' : undefined
          }
          onChange={(event) => {
            setPassword(event.target.value);
            clearError('password');
          }}
        />
        {errors.password && (
          <p id="reset-password-error" className={styles.fieldError}>
            {errors.password}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="reset-confirm-password">
          确认新密码
        </label>
        <Input
          id="reset-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={
            errors.confirmPassword
              ? 'reset-confirm-password-error'
              : undefined
          }
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            clearError('confirmPassword');
          }}
        />
        {errors.confirmPassword && (
          <p
            id="reset-confirm-password-error"
            className={styles.fieldError}
          >
            {errors.confirmPassword}
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
        {isSubmitting ? '正在重置...' : '重置密码'}
      </Button>
    </form>
  );
}
