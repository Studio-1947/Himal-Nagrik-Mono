import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
} from 'drizzle-orm/pg-core';
import { appUsers, rides } from './users';

export const ratings = pgTable('ratings', {
  id: uuid('id').primaryKey(),
  rideId: uuid('ride_id')
    .references(() => rides.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  raterId: uuid('rater_id')
    .references(() => appUsers.id, { onDelete: 'cascade' })
    .notNull(),
  rateeId: uuid('ratee_id')
    .references(() => appUsers.id, { onDelete: 'cascade' })
    .notNull(),
  raterRole: text('rater_role').$type<'passenger' | 'driver'>().notNull(),
  score: integer('score').notNull(), // 1-5
  review: text('review'),
  isAnonymous: boolean('is_anonymous').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});




