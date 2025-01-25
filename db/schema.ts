import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  emailValidated: boolean("email_validated").default(false).notNull(),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id).notNull(),
  deviceToken: text("device_token").notNull(),
  oneTimeCode: text("one_time_code"), // Removed notNull constraint
  emailId: text("email_id").unique().notNull(),
  registered: boolean("registered").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create base schemas from the tables
const baseUserSchema = createInsertSchema(users);
const baseDeviceSchema = createInsertSchema(devices);

// Extend the base schema with additional validation
export const insertUserSchema = baseUserSchema.extend({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const selectUserSchema = createSelectSchema(users);
export const insertDeviceSchema = baseDeviceSchema;
export const selectDeviceSchema = createSelectSchema(devices);

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;