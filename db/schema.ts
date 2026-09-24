import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
export const openedFortunes = sqliteTable('opened_fortunes', {
  id: integer('id').primaryKey(),
  requestId: text('request_id').notNull().unique(),
  openedBy: text('opened_by').notNull(),
  openedAt: text('opened_at').notNull(),
});
