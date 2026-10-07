import {
  integer,
  text,
  index,
  uniqueIndex,
  sqliteTable,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Enums
export const userStatusValues = ['active', 'suspended', 'deleted'] as const;
export const profileVisibilityValues = ['public', 'hidden'] as const;
export const penpalRequestStatusValues = ['pending', 'accepted', 'rejected', 'cancelled'] as const;
export const relationshipStatusValues = ['active', 'ended'] as const;
export const letterStatusValues = ['draft', 'sent'] as const;
export const notificationTypeValues = ['penpal_request', 'request_accepted', 'new_letter', 'system'] as const;
export const reportReasonValues = ['harassment', 'sexual_content', 'fraud', 'hate', 'spam', 'other'] as const;
export const reportStatusValues = ['pending', 'reviewing', 'resolved', 'dismissed'] as const;

// Tables
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  status: text('status', { enum: userStatusValues }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  lastActiveAt: integer('last_active_at', { mode: 'timestamp' }),
});

export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  nickname: text('nickname').notNull(),
  avatarUrl: text('avatar_url'),
  country: text('country'),
  city: text('city'),
  ageRange: text('age_range'),
  bio: text('bio'),
  penpalReason: text('penpal_reason'),
  languages: text('languages', { mode: 'json' }).$type<string[]>().notNull().default([]),
  visibility: text('visibility', { enum: profileVisibilityValues }).notNull().default('public'),
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('profiles_visibility_onboarding_idx').on(table.visibility, table.onboardingCompleted),
]);

export const interests = sqliteTable('interests', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  category: text('category'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const userInterests = sqliteTable('user_interests', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  interestId: text('interest_id').notNull().references(() => interests.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  primaryKey({ columns: [table.userId, table.interestId] }),
  index('user_interests_user_id_interest_id_idx').on(table.userId, table.interestId),
]);

export const penpalRequests = sqliteTable('penpal_requests', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: text('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  initialLetterId: text('initial_letter_id'),
  status: text('status', { enum: penpalRequestStatusValues }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  respondedAt: integer('responded_at', { mode: 'timestamp' }),
}, (table) => [
  index('penpal_requests_sender_id_receiver_id_status_idx').on(table.senderId, table.receiverId, table.status),
  index('penpal_requests_receiver_id_status_idx').on(table.receiverId, table.status),
  uniqueIndex('penpal_requests_pending_unique_idx')
    .on(table.senderId, table.receiverId)
    .where(sql`status = 'pending'`),
]);

export const penpalRelationships = sqliteTable('penpal_relationships', {
  id: text('id').primaryKey(),
  userLowId: text('user_low_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userHighId: text('user_high_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: relationshipStatusValues }).notNull().default('active'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  lastLetterAt: integer('last_letter_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('penpal_relationships_user_low_high_idx').on(table.userLowId, table.userHighId),
  uniqueIndex('penpal_relationships_active_unique_idx')
    .on(table.userLowId, table.userHighId)
    .where(sql`status = 'active'`),
]);

export const letters = sqliteTable('letters', {
  id: text('id').primaryKey(),
  relationshipId: text('relationship_id').references(() => penpalRelationships.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientId: text('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject'),
  body: text('body').notNull(),
  status: text('status', { enum: letterStatusValues }).notNull().default('draft'),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  readAt: integer('read_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('letters_relationship_id_created_at_idx').on(table.relationshipId, table.createdAt),
  index('letters_recipient_id_status_created_at_idx').on(table.recipientId, table.status, table.createdAt),
]);

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: notificationTypeValues }).notNull(),
  title: text('title').notNull(),
  body: text('body'),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  readAt: integer('read_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('notifications_user_id_read_at_created_at_idx').on(table.userId, table.readAt, table.createdAt),
]);

export const blocks = sqliteTable('blocks', {
  id: text('id').primaryKey(),
  blockerId: text('blocker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedId: text('blocked_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  primaryKey({ columns: [table.blockerId, table.blockedId] }),
  index('blocks_blocker_id_blocked_id_idx').on(table.blockerId, table.blockedId),
]);

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  reporterId: text('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reportedUserId: text('reported_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  letterId: text('letter_id').references(() => letters.id, { onDelete: 'set null' }),
  reason: text('reason', { enum: reportReasonValues }).notNull(),
  description: text('description'),
  status: text('status', { enum: reportStatusValues }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
}, (table) => [
  index('reports_status_created_at_idx').on(table.status, table.createdAt),
]);
