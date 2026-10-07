import type { User } from 'better-auth';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '../db/client';
import { authSchema } from '../db/auth-schema';
import { getAppUrl } from './env';

type AuthDatabase = Parameters<typeof drizzleAdapter>[0];

interface ResetPasswordData {
  user: User;
  url: string;
  token: string;
}

export interface CreateAuthOptions {
  sendResetPassword?: (data: ResetPasswordData) => Promise<void>;
}

async function sendConfiguredResetPassword(): Promise<void> {
  throw new Error('Password reset email delivery is not configured.');
}

export function createAuth(
  database: AuthDatabase,
  options: CreateAuthOptions = {},
) {
  return betterAuth({
    baseURL: getAppUrl(),
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(database, {
      provider: 'sqlite',
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      sendResetPassword:
        options.sendResetPassword ?? sendConfiguredResetPassword,
    },
    plugins: [nextCookies()],
  });
}

export const auth = createAuth(db);

export interface CurrentUser {
  id: string;
  email: string;
}

export async function getCurrentUser(
  headers: Headers,
): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
  };
}

export async function getCurrentUserId(headers: Headers): Promise<string | null> {
  return (await getCurrentUser(headers))?.id ?? null;
}
