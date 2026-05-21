import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userCardsTable = pgTable(
  "user_cards",
  {
    clerkUserId: text("clerk_user_id").notNull(),
    cardId: text("card_id").notNull(),
    count: integer("count").notNull().default(1),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.clerkUserId, t.cardId] })],
);

export const insertUserCardSchema = createInsertSchema(userCardsTable).omit({ unlockedAt: true });
export type InsertUserCard = z.infer<typeof insertUserCardSchema>;
export type UserCard = typeof userCardsTable.$inferSelect;
