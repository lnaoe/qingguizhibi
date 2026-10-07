export type AuthMode = 'login' | 'register';

export interface AuthFormValues {
  email: string;
  password: string;
  confirmPassword?: string;
}

export type AuthFormErrors = Partial<
  Record<'email' | 'password' | 'confirmPassword', string>
>;

export type PasswordResetRequestErrors = Partial<Record<'email', string>>;

export type NewPasswordErrors = Partial<
  Record<'password' | 'confirmPassword', string>
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getEmailError(value: string): string | undefined {
  const email = value.trim();

  if (!email) {
    return '请输入邮箱';
  }

  if (!EMAIL_PATTERN.test(email)) {
    return '请输入有效的邮箱地址';
  }

  return undefined;
}

function getPasswordError(
  password: string,
  enforceMinimumLength: boolean,
): string | undefined {
  if (!password) {
    return '请输入密码';
  }

  if (enforceMinimumLength && password.length < 8) {
    return '密码至少需要 8 个字符';
  }

  return undefined;
}

function getConfirmPasswordError(
  password: string,
  confirmPassword: string | undefined,
): string | undefined {
  if (password !== confirmPassword) {
    return '两次输入的密码不一致';
  }

  return undefined;
}

export function validateAuthForm(
  mode: AuthMode,
  values: AuthFormValues,
): AuthFormErrors {
  const errors: AuthFormErrors = {};
  const emailError = getEmailError(values.email);
  const passwordError = getPasswordError(
    values.password,
    mode === 'register',
  );

  if (emailError) {
    errors.email = emailError;
  }

  if (passwordError) {
    errors.password = passwordError;
  }

  if (mode === 'register') {
    const confirmPasswordError = getConfirmPasswordError(
      values.password,
      values.confirmPassword,
    );

    if (confirmPasswordError) {
      errors.confirmPassword = confirmPasswordError;
    }
  }

  return errors;
}

export function validatePasswordResetRequest(values: {
  email: string;
}): PasswordResetRequestErrors {
  const emailError = getEmailError(values.email);

  return emailError ? { email: emailError } : {};
}

export function validateNewPassword(values: {
  password: string;
  confirmPassword: string;
}): NewPasswordErrors {
  const errors: NewPasswordErrors = {};
  const passwordError = getPasswordError(values.password, true);
  const confirmPasswordError = getConfirmPasswordError(
    values.password,
    values.confirmPassword,
  );

  if (passwordError) {
    errors.password = passwordError;
  }

  if (confirmPasswordError) {
    errors.confirmPassword = confirmPasswordError;
  }

  return errors;
}

export function getDefaultName(email: string): string {
  return email.trim().split('@')[0]?.trim() || '新朋友';
}

export function getAuthErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const code =
    'code' in error && typeof error.code === 'string'
      ? error.code.toUpperCase()
      : '';
  const message =
    'message' in error && typeof error.message === 'string'
      ? error.message.toLowerCase()
      : '';

  if (
    code.includes('USER_ALREADY_EXISTS') ||
    message.includes('already exists')
  ) {
    return '这个邮箱已经注册过了';
  }

  if (
    code.includes('INVALID_EMAIL_OR_PASSWORD') ||
    message.includes('invalid email or password')
  ) {
    return '邮箱或密码不正确';
  }

  if (code.includes('INVALID_TOKEN') || message.includes('invalid token')) {
    return '重置链接无效或已过期，请重新申请。';
  }

  if (code.includes('INVALID_EMAIL') || message.includes('invalid email')) {
    return '请输入有效的邮箱地址';
  }

  if (
    code.includes('PASSWORD_TOO_SHORT') ||
    message.includes('password is too short') ||
    message.includes('at least 8')
  ) {
    return '密码至少需要 8 个字符';
  }

  return fallback;
}
