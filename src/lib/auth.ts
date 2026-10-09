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

function getTrustedOrigins(request?: Request): string[] {
  const origins = new Set<string>([getAppUrl()]);

  if (request) {
    try {
      origins.add(new URL(request.url).origin);
    } catch {
      // Keep the configured origin when the request URL cannot be parsed.
    }

    const host =
      request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    const normalizedHost = host?.split(',')[0]?.trim();
    const forwardedProtocol = request.headers
      .get('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim();

    if (normalizedHost) {
      try {
        const protocol =
          forwardedProtocol === 'https' || forwardedProtocol === 'http'
            ? forwardedProtocol
            : new URL(request.url).protocol.slice(0, -1);
        origins.add(new URL(`${protocol}://${normalizedHost}`).origin);
      } catch {
        // Ignore malformed host headers and retain the configured origin.
      }
    }
  }

  return [...origins];
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
    trustedOrigins: getTrustedOrigins,
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
    advanced: {
      disableOriginCheck: false,
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
