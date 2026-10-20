import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Quote, Settings } from "../model";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  // client : demande des devis ; menuisier : crée des devis et un profil public ; admin : plateforme
  role: text("role", { enum: ["client", "menuisier", "admin"] }).notNull().default("client"),
  phone: text("phone").notNull().default(""),
  avatar: text("avatar").notNull().default(""), // photo de profil (data URL réduite), facultative
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// L'identifiant est l'empreinte SHA-256 du jeton du cookie : une fuite de la base ne donne pas de session utilisable.
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const settings = pgTable("settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<Partial<Settings>>().notNull().default({}),
  // prochain numéro de devis : incrémenté atomiquement côté base
  counter: integer("counter").notNull().default(1),
});

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    status: text("status").notNull(),
    // client qui a demandé ce devis (null : devis saisi par le menuisier pour un client sans compte)
    clientId: uuid("client_id").references(() => users.id, { onDelete: "set null" }),
    progress: integer("progress").notNull().default(0), // avancement du chantier, en %
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    data: jsonb("data").$type<Quote>().notNull(),
  },
  (t) => [index("quotes_user_idx").on(t.userId), index("quotes_client_idx").on(t.clientId), uniqueIndex("quotes_user_number_idx").on(t.userId, t.number)],
);

// Profil public du menuisier : visible dans l'annuaire seulement s'il est publié.
export const menuisierProfiles = pgTable("menuisier_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  city: text("city").notNull().default(""),
  bio: text("bio").notNull().default(""),
  specialties: jsonb("specialties").$type<string[]>().notNull().default([]),
  logo: text("logo").notNull().default(""),
  published: boolean("published").notNull().default(false),
  verified: boolean("verified").notNull().default(false), // accordé par l'équipe de la plateforme
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// shortcut: images stockées en base (data URL réduites côté navigateur), à déplacer vers un stockage de fichiers (Vercel Blob, S3) avant la montée en charge.
export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default(""),
    year: integer("year"),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    thumb: text("thumb").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("portfolio_user_idx").on(t.userId)],
);

// Historique d'un devis : ce qui s'est passé, par qui, avec le message éventuel.
export const quoteEvents = pgTable(
  "quote_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    message: text("message").notNull().default(""),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quote_events_quote_idx").on(t.quoteId)],
);

// Une seule évaluation par devis, et seulement quand le chantier est terminé.
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteId: uuid("quote_id")
    .notNull()
    .unique()
    .references(() => quotes.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => users.id, { onDelete: "set null" }),
  menuisierId: uuid("menuisier_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
  menuisierId: uuid("menuisier_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  details: text("details").notNull().default(""),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
