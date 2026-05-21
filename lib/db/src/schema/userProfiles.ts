import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfilesTable = pgTable("user_profiles", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  // Nullable until the player picks one via the username setup screen.
  // Uniqueness is enforced case-insensitively via a Postgres expression index
  // (`user_profiles_display_name_lower_uq` on LOWER(display_name)), not via a
  // column-level UNIQUE — see the migration in routes/me.ts comments.
  displayName: text("display_name"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  gold: integer("gold").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  selectedDeckSlot: integer("selected_deck_slot").notNull().default(0),
  tutorialDone: integer("tutorial_done").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({ createdAt: true, updatedAt: true });
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;
