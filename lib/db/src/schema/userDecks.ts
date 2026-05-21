import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Each row = one deck slot for a user (slot 0..2)
// cardIds is a fixed-length array of 8 card ids
export const userDecksTable = pgTable(
  "user_decks",
  {
    clerkUserId: text("clerk_user_id").notNull(),
    slot: integer("slot").notNull(),
    cardIds: text("card_ids").array().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.clerkUserId, t.slot] })],
);

export const insertUserDeckSchema = createInsertSchema(userDecksTable).omit({ updatedAt: true });
export type InsertUserDeck = z.infer<typeof insertUserDeckSchema>;
export type UserDeck = typeof userDecksTable.$inferSelect;
