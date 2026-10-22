import { type AnyPgColumn, boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Market, Quote, Settings } from "../model";

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

// Messagerie : une conversation par couple (client, menuisier) ; les messages sont rattachés à la conversation.
// Le « lu » se mémorise par participant (date de dernière lecture) : non lus = messages de l'autre postérieurs à cette date.
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    menuisierId: uuid("menuisier_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    clientReadAt: timestamp("client_read_at", { withTimezone: true }).notNull().defaultNow(),
    menuisierReadAt: timestamp("menuisier_read_at", { withTimezone: true }).notNull().defaultNow(),
    // dernière fois que l'appareil de chaque participant a reçu les messages (accusé de réception : ✓✓)
    clientDeliveredAt: timestamp("client_delivered_at", { withTimezone: true }).notNull().defaultNow(),
    menuisierDeliveredAt: timestamp("menuisier_delivered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("conversations_pair_idx").on(t.clientId, t.menuisierId), index("conversations_menuisier_idx").on(t.menuisierId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull().default(""),
    // réponse à un message du même fil, et devis cité (tag) dans le message
    replyToId: uuid("reply_to_id").references((): AnyPgColumn => messages.id, { onDelete: "set null" }),
    quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_conv_idx").on(t.conversationId, t.createdAt)],
);

// « Écrit… » / « enregistre un vocal… » : une ligne par participant et conversation, valable quelques secondes (voir lib/chat.ts).
export const conversationTyping = pgTable(
  "conversation_typing",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["text", "voice"] }).notNull().default("text"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("conversation_typing_pk").on(t.conversationId, t.userId)],
);

// shortcut: pièces jointes stockées en base (contenu en base64), à déplacer vers un stockage de fichiers (Vercel Blob, S3) avant la montée en charge.
export const messageAttachments = pgTable(
  "message_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    durationMs: integer("duration_ms"), // durée d'un message vocal
    data: text("data").notNull(),
  },
  (t) => [index("message_attachments_msg_idx").on(t.messageId)],
);

// Catalogue des fournisseurs propre à un devis : à défaut, le devis utilise le catalogue général du menuisier.
// Table séparée de `quotes` : ces prix d'achat ne sont jamais renvoyés avec le devis au client.
export const quoteCatalogs = pgTable("quote_catalogs", {
  quoteId: uuid("quote_id")
    .primaryKey()
    .references(() => quotes.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<Market>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
