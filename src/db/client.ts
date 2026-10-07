import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { authSchema, ensureAuthTables } from './auth-schema';

const sqlite = new Database('qinggui.db');
ensureAuthTables(sqlite);

export const db = drizzle(sqlite, { schema: { ...schema, ...authSchema } });

export type AppDatabase = typeof db;
