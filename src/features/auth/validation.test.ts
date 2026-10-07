import { describe, expect, it } from 'vitest';
import {
  getAuthErrorMessage,
  getDefaultName,
  validateAuthForm,
  validateNewPassword,
  validatePasswordResetRequest,
} from './validation';

describe('validateAuthForm', () => {
  it('requires a valid email and password', () => {
    expect(
      validateAuthForm('register', {
        email: 'not-an-email',
        password: 'short',
        confirmPassword: 'different',
      }),
    ).toEqual({
      email: '请输入有效的邮箱地址',
      password: '密码至少需要 8 个字符',
      confirmPassword: '两次输入的密码不一致',
    });
  });

  it('accepts valid registration values', () => {
    expect(
      validateAuthForm('register', {
        email: 'penpal@example.com',
        password: 'long-enough-password',
        confirmPassword: 'long-enough-password',
      }),
    ).toEqual({});
  });

  it('does not apply the registration password length rule to login', () => {
    expect(
      validateAuthForm('login', {
        email: 'penpal@example.com',
        password: 'short',
      }),
    ).toEqual({});
  });
});

describe('auth helpers', () => {
  it('builds a usable default name from the email', () => {
    expect(getDefaultName('  penpal@example.com  ')).toBe('penpal');
    expect(getDefaultName('')).toBe('新朋友');
  });

  it('maps known Better Auth errors to Chinese messages', () => {
    expect(
      getAuthErrorMessage(
        { code: 'USER_ALREADY_EXISTS', message: 'User already exists' },
        '注册失败',
      ),
    ).toBe('这个邮箱已经注册过了');
    expect(
      getAuthErrorMessage(
        { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
        '登录失败',
      ),
    ).toBe('邮箱或密码不正确');
    expect(
      getAuthErrorMessage(
        { code: 'INVALID_TOKEN', message: 'Invalid token' },
        '重置失败',
      ),
    ).toBe('重置链接无效或已过期，请重新申请。');
  });

  it('uses the supplied fallback for unknown errors', () => {
    expect(getAuthErrorMessage(new Error('Network unavailable'), '请稍后重试')).toBe(
      '请稍后重试',
    );
  });
});

describe('password reset validation', () => {
  it('validates the reset request email', () => {
    expect(validatePasswordResetRequest({ email: '' })).toEqual({
      email: '请输入邮箱',
    });
    expect(validatePasswordResetRequest({ email: 'not-an-email' })).toEqual({
      email: '请输入有效的邮箱地址',
    });
    expect(
      validatePasswordResetRequest({ email: 'penpal@example.com' }),
    ).toEqual({});
  });

  it('requires matching passwords of at least eight characters', () => {
    expect(
      validateNewPassword({
        password: 'short',
        confirmPassword: 'different',
      }),
    ).toEqual({
      password: '密码至少需要 8 个字符',
      confirmPassword: '两次输入的密码不一致',
    });
    expect(
      validateNewPassword({
        password: 'long-enough-password',
        confirmPassword: 'long-enough-password',
      }),
    ).toEqual({});
  });
});
