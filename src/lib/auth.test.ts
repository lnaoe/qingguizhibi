import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { authSchema, ensureAuthTables } from '../db/auth-schema';
import * as businessSchema from '../db/schema';
import { createAuth, type CreateAuthOptions } from './auth';

const BASE_URL = 'http://localhost:3000';

function createTestAuth(options?: CreateAuthOptions) {
  const sqlite = new Database(':memory:');
  ensureAuthTables(sqlite);
  const database = drizzle(sqlite, { schema: authSchema });
  return { auth: createAuth(database, options), database };
}

function readSessionCookie(response: Response): string {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('Expected an authentication cookie in the response.');
  }
  return setCookie.split(';')[0]!;
}

function postJson(init: { path: string; body: unknown; cookie?: string }) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    origin: BASE_URL,
  };
  if (init.cookie) {
    headers.cookie = init.cookie;
  }
  return new Request(`${BASE_URL}/api/auth/${init.path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(init.body),
  });
}

async function getSession(
  auth: ReturnType<typeof createAuth>,
  cookie: string,
): Promise<{ user: { id: string; email: string } } | null> {
  const response = await auth.handler(
    new Request(`${BASE_URL}/api/auth/get-session`, { headers: { cookie } }),
  );
  expect(response.status).toBe(200);
  return response.json();
}

describe('auth', () => {
  it('registers, resolves the session, logs out and logs back in', async () => {
    const { auth, database } = createTestAuth();
    const email = 'penpal@example.com';
    const password = 'correct-horse-battery-staple';

    const signUp = await auth.handler(
      postJson({ path: 'sign-up/email', body: { email, password, name: '纸笔' } }),
    );
    expect(signUp.status).toBe(200);
    const registerCookie = readSessionCookie(signUp);

    const session = await getSession(auth, registerCookie);
    expect(session?.user.email).toBe(email);

    const signOut = await auth.handler(
      postJson({ path: 'sign-out', body: {}, cookie: registerCookie }),
    );
    expect(signOut.status).toBe(200);
    expect(await getSession(auth, registerCookie)).toBeNull();

    const signIn = await auth.handler(
      postJson({ path: 'sign-in/email', body: { email, password } }),
    );
    expect(signIn.status).toBe(200);
    const loginCookie = readSessionCookie(signIn);
    expect((await getSession(auth, loginCookie))?.user.email).toBe(email);

    const accounts = database.select().from(authSchema.account).all();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.password).toBeTruthy();
    expect(accounts[0]!.password).not.toBe(password);
  });

  it('rejects sign in with a wrong password', async () => {
    const { auth } = createTestAuth();

    await auth.handler(
      postJson({
        path: 'sign-up/email',
        body: { email: 'wrong-password@example.com', password: 'a-valid-password', name: '纸笔' },
      }),
    );

    const signIn = await auth.handler(
      postJson({
        path: 'sign-in/email',
        body: { email: 'wrong-password@example.com', password: 'not-the-password' },
      }),
    );
    expect(signIn.status).toBe(401);
  });

  it('requests and completes a password reset', async () => {
    const resetDeliveries: Array<{
      email: string;
      token: string;
      url: string;
    }> = [];
    const { auth } = createTestAuth({
      sendResetPassword: async ({ user, token, url }) => {
        resetDeliveries.push({
          email: user.email,
          token,
          url,
        });
      },
    });
    const email = 'reset-password@example.com';
    const oldPassword = 'old-password';
    const newPassword = 'new-password';

    const signUp = await auth.handler(
      postJson({
        path: 'sign-up/email',
        body: { email, password: oldPassword, name: '纸笔' },
      }),
    );
    expect(signUp.status).toBe(200);

    const requestReset = await auth.handler(
      postJson({
        path: 'request-password-reset',
        body: { email, redirectTo: '/reset-password' },
      }),
    );
    expect(requestReset.status).toBe(200);
    await expect(requestReset.json()).resolves.toMatchObject({
      status: true,
    });
    expect(resetDeliveries).toHaveLength(1);
    expect(resetDeliveries[0]!.email).toBe(email);
    expect(resetDeliveries[0]!.url).toContain(
      `/api/auth/reset-password/${resetDeliveries[0]!.token}`,
    );

    const resetCallback = await auth.handler(
      new Request(resetDeliveries[0]!.url),
    );
    expect(resetCallback.status).toBe(302);
    expect(resetCallback.headers.get('location')).toBe(
      `${BASE_URL}/reset-password?token=${resetDeliveries[0]!.token}`,
    );

    const resetPassword = await auth.handler(
      postJson({
        path: 'reset-password',
        body: {
          newPassword,
          token: resetDeliveries[0]!.token,
        },
      }),
    );
    expect(resetPassword.status).toBe(200);
    await expect(resetPassword.json()).resolves.toEqual({ status: true });

    const oldPasswordSignIn = await auth.handler(
      postJson({
        path: 'sign-in/email',
        body: { email, password: oldPassword },
      }),
    );
    expect(oldPasswordSignIn.status).toBe(401);

    const newPasswordSignIn = await auth.handler(
      postJson({
        path: 'sign-in/email',
        body: { email, password: newPassword },
      }),
    );
    expect(newPasswordSignIn.status).toBe(200);
  });

  it('rejects an invalid password reset token', async () => {
    const { auth } = createTestAuth({
      sendResetPassword: async () => {},
    });

    const resetPassword = await auth.handler(
      postJson({
        path: 'reset-password',
        body: {
          newPassword: 'new-password',
          token: 'invalid-token',
        },
      }),
    );

    expect(resetPassword.status).toBe(400);
  });

  it('does not reveal whether a reset email exists', async () => {
    const resetDeliveries: string[] = [];
    const { auth } = createTestAuth({
      sendResetPassword: async ({ user }) => {
        resetDeliveries.push(user.email);
      },
    });

    const requestReset = await auth.handler(
      postJson({
        path: 'request-password-reset',
        body: {
          email: 'missing@example.com',
          redirectTo: '/reset-password',
        },
      }),
    );

    expect(requestReset.status).toBe(200);
    await expect(requestReset.json()).resolves.toMatchObject({
      status: true,
    });
    expect(resetDeliveries).toEqual([]);
  });

  it('keeps password storage out of the business users table', () => {
    expect(Object.keys(getTableColumns(businessSchema.users))).not.toContain('password');
    expect(Object.keys(getTableColumns(authSchema.account))).toContain('password');
    expect(getTableName(authSchema.user)).toBe('auth_user');
    expect(getTableName(authSchema.account)).toBe('auth_account');
  });
});
