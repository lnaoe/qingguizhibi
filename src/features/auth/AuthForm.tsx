'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { authClient } from '@/lib/auth-client';
import {
  getAuthErrorMessage,
  getDefaultName,
  validateAuthForm,
  type AuthFormErrors,
  type AuthMode,
} from './validation';
import styles from './auth.module.css';

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === 'register';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function clearError(field: keyof AuthFormErrors) {
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

    const nextErrors = validateAuthForm(mode, {
      email,
      password,
      confirmPassword,
    });
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const normalizedEmail = email.trim();
    setIsSubmitting(true);

    try {
      const result = isRegister
        ? await authClient.signUp.email({
            email: normalizedEmail,
            password,
            name: getDefaultName(normalizedEmail),
          })
        : await authClient.signIn.email({
            email: normalizedEmail,
            password,
          });

      if (result.error) {
        setFormError(
          getAuthErrorMessage(
            result.error,
            isRegister ? '注册失败，请稍后重试。' : '登录失败，请稍后重试。',
          ),
        );
        return;
      }

      router.replace('/onboarding');
      router.refresh();
    } catch (error) {
      setFormError(
        getAuthErrorMessage(
          error,
          isRegister ? '注册失败，请稍后重试。' : '登录失败，请稍后重试。',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${mode}-email`}>
          邮箱
        </label>
        <Input
          id={`${mode}-email`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${mode}-email-error` : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            clearError('email');
          }}
        />
        {errors.email && (
          <p id={`${mode}-email-error`} className={styles.fieldError}>
            {errors.email}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${mode}-password`}>
          密码
        </label>
        <Input
          id={`${mode}-password`}
          name="password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          value={password}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password ? `${mode}-password-error` : undefined
          }
          onChange={(event) => {
            setPassword(event.target.value);
            clearError('password');
          }}
        />
        {errors.password && (
          <p id={`${mode}-password-error`} className={styles.fieldError}>
            {errors.password}
          </p>
        )}
      </div>

      {isRegister && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${mode}-confirm-password`}>
            确认密码
          </label>
          <Input
            id={`${mode}-confirm-password`}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword
                ? `${mode}-confirm-password-error`
                : undefined
            }
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearError('confirmPassword');
            }}
          />
          {errors.confirmPassword && (
            <p
              id={`${mode}-confirm-password-error`}
              className={styles.fieldError}
            >
              {errors.confirmPassword}
            </p>
          )}
        </div>
      )}

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
        {isSubmitting
          ? isRegister
            ? '正在创建账号...'
            : '正在登录...'
          : isRegister
            ? '创建账号'
            : '登录'}
      </Button>
    </form>
  );
}
