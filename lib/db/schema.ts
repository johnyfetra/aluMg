import { sql } from "drizzle-orm";
import { type AnyPgColumn, boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { DemoMode, DemoStatus } from "../booking";
import { AUDIT_ACTIONS, SOCIAL_NETWORKS, type FeedbackKind, type FeedbackStatus, type Market, type Quote, type Settings } from "../model";

// Texte cherché par l'administration ; la requête (lib/admin.ts) reprend exactement cette expression pour que l'index serve.
export const USER_SEARCH = sql.raw(`lower(name || ' ' || coalesce(email, '') || ' ' || regexp_replace(phone, '[^0-9]', '', 'g'))`);

export const users = pgTable(
  "users",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(), // facultatif : le téléphone est l'identifiant obligatoire ; plusieurs NULL autorisés
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  // client : demande des devis ; menuisier : crée des devis et un profil public ; admin : plateforme
  role: text("role", { enum: ["client", "menuisier", "admin"] }).notNull().default("client"),
  phone: text("phone").notNull().default(""),
  phoneNorm: text("phone_norm"), // numéro normalisé (+261…) : unique, sert à la connexion et à la vérification
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  avatar: text("avatar").notNull().default(""), // photo de profil (data URL réduite), facultative
  mustChangePassword: boolean("must_change_password").notNull().default(false), // mot de passe temporaire donné par l'administration : à remplacer à la première connexion
  suspendedAt: timestamp("suspended_at", { withTimezone: true }), // suspendu par un administrateur : ni connexion, ni session valide
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
},
  (t) => [
    uniqueIndex("users_phone_norm_idx").on(t.phoneNorm),
    index("users_created_idx").on(t.createdAt),
    index("users_role_idx").on(t.role, t.createdAt), // filtre par rôle de l'administration, déjà dans l'ordre d'affichage
    // recherche de l'administration (nom, e-mail, téléphone en chiffres) : trigrammes, sert les « contient » (ILIKE '%…%')
    index("users_search_idx").using("gin", sql`(${USER_SEARCH}) gin_trgm_ops`),
  ],
);

// L'identifiant est l'empreinte SHA-256 du jeton du cookie : une fuite de la base ne donne pas de session utilisable.
// `lastSeenAt` : présence (« connectés en ce moment »), rafraîchie au plus une fois par minute (lib/auth.ts).
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_seen_idx").on(t.lastSeenAt)],
);

// Une ligne par connexion réussie (les sessions disparaissent à la déconnexion) : statistiques de l'administration.
export const logins = pgTable(
  "logins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("logins_created_idx").on(t.createdAt)],
);

// Journal de l'administration. La cible est recopiée (id et libellé, sans clé étrangère) pour survivre à la suppression du compte.
export const adminAudit = pgTable(
  "admin_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull(),
    action: text("action", { enum: AUDIT_ACTIONS }).notNull(),
    targetId: uuid("target_id"),
    targetLabel: text("target_label").notNull().default(""),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_audit_created_idx").on(t.createdAt)],
);

// Réseaux sociaux de la plateforme (page Facebook, Instagram…) : gérés dans l'espace d'administration, lus par le pied de page public.
export const socialLinks = pgTable("social_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  network: text("network", { enum: SOCIAL_NETWORKS }).notNull(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
  (t) => [index("quotes_user_idx").on(t.userId), index("quotes_client_idx").on(t.clientId), uniqueIndex("quotes_user_number_idx").on(t.userId, t.number), index("quotes_created_idx").on(t.createdAt), index("quotes_user_status_idx").on(t.userId, t.status)], // chantiers terminés par menuisier (annuaire)
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
  zones: jsonb("zones").$type<string[]>().notNull().default([]), // villes et régions d'intervention
  sinceYear: integer("since_year"), // début de l'activité
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
    project: text("project").notNull().default(""), // nom du chantier
    city: text("city").notNull().default(""),
    before: text("before").notNull().default(""), // photo « avant » pour le comparateur
    images: jsonb("images").$type<string[]>().notNull().default([]),
    thumb: text("thumb").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("portfolio_user_idx").on(t.userId)],
);

// Téléchargements du PDF d'un devis, par le menuisier qui l'a établi ou par le client qui l'a reçu : l'administration en lit le nombre sur chaque devis.
export const quoteDownloads = pgTable(
  "quote_downloads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    role: text("role", { enum: ["menuisier", "client"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quote_downloads_quote_idx").on(t.quoteId)],
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
  (t) => [index("quote_events_quote_idx").on(t.quoteId), index("quote_events_kind_idx").on(t.kind, t.createdAt)],
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
}, (t) => [index("reviews_menuisier_idx").on(t.menuisierId)]); // note moyenne de l'annuaire : avis regroupés par menuisier

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

// Numéros supplémentaires d'un compte (le numéro principal reste dans users.phone). Un numéro n'appartient qu'à un seul compte, principal ou non :
// l'unicité est garantie dans la base (index unique ici, et déclencheur qui compare avec users.phone_norm, voir la migration).
export const userPhones = pgTable(
  "user_phones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(), // tel que saisi, pour l'affichage
    phoneNorm: text("phone_norm").notNull(), // +261… : unique
    label: text("label").notNull().default(""), // « Bureau », « WhatsApp »…
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(), // un numéro n'est ajouté qu'après confirmation par code
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_phones_norm_idx").on(t.phoneNorm), index("user_phones_user_idx").on(t.userId)],
);

// Retours des utilisateurs (problème, idée de fonction, remarque). Le compte peut disparaître : le message reste, signé du nom d'alors.
export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    authorRole: text("author_role").notNull(),
    kind: text("kind").$type<FeedbackKind>().notNull(),
    message: text("message").notNull(),
    page: text("page").notNull().default(""), // écran d'où part le retour : aide à reproduire un problème
    status: text("status").$type<FeedbackStatus>().notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("feedback_status_idx").on(t.status, t.createdAt), index("feedback_created_idx").on(t.createdAt)],
);

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
    // messages éphémères : durée de vie (secondes) des NOUVEAUX messages, 0 = désactivé ; réglage commun aux deux participants
    ephemeralSec: integer("ephemeral_sec").notNull().default(0),
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
    expiresAt: timestamp("expires_at", { withTimezone: true }), // messages éphémères : masqué puis supprimé après cette date
  },
  (t) => [index("messages_conv_idx").on(t.conversationId, t.createdAt)],
);

// Réglages propres à chaque participant d'une conversation : favori, silencieux, blocage, « effacer » (messages antérieurs masqués) et « supprimer » (fil masqué jusqu'au prochain message).
export const conversationPrefs = pgTable(
  "conversation_prefs",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    favorite: boolean("favorite").notNull().default(false),
    muted: boolean("muted").notNull().default(false),
    blocked: boolean("blocked").notNull().default(false),
    hidden: boolean("hidden").notNull().default(false),
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("conversation_prefs_pk").on(t.conversationId, t.userId)],
);

// Messages importants (étoile) : visibles seulement de celui qui les a marqués.
export const messageStars = pgTable(
  "message_stars",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("message_stars_pk").on(t.messageId, t.userId)],
);

// Signalements d'un interlocuteur, lus par l'administration.
export const conversationReports = pgTable(
  "conversation_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason", { enum: ["spam", "abuse", "scam", "other"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("conversation_reports_conv_idx").on(t.conversationId)],
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

// Notifications : un événement du devis qui concerne l'autre partie (commentaire sur un ouvrage, décision, devis modifié…).
// Un clic mène au devis, et à l'ouvrage précis quand `lineId` est renseigné.
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    lineId: text("line_id"),
    kind: text("kind").notNull(),
    message: text("message").notNull().default(""),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

// Carnet de clients du menuisier : un contact = nom, téléphone, e-mail, et le compte client AluMg s'il existe (retrouvé par l'e-mail).
// Alimenté à la main, ou automatiquement quand un client demande un devis / reçoit un devis.
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    note: text("note").notNull().default(""),
    discount: integer("discount").notNull().default(0), // remise habituelle accordée à ce client, en % (préremplie sur ses nouveaux devis)
    clientUserId: uuid("client_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contacts_user_idx").on(t.userId)],
);

// Limitation de débit : un compteur par clé (« login:ip:1.2.3.4 ») et par fenêtre. En base pour rester juste avec plusieurs instances.
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});

// Codes de vérification à usage unique (SMS, appel vocal, e-mail). Seule l'empreinte du code est stockée.
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: text("channel", { enum: ["sms", "call", "email"] }).notNull(),
    purpose: text("purpose", { enum: ["account", "phone"] }).notNull().default("account"), // « phone » : ajout d'un numéro supplémentaire (le compte n'est pas vérifié par ce code)
    target: text("target").notNull(), // numéro normalisé ou e-mail visé
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verifications_user_idx").on(t.userId, t.createdAt)],
);

// Demandes de démonstration sur place, prises sans compte depuis la page d'accueil ; traitées dans l'administration.
// Un créneau (jour, heure) n'est pris qu'une fois tant que le rendez-vous n'est pas annulé (index unique partiel).
export const demoBookings = pgTable(
  "demo_bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    phone: text("phone").notNull(), // forme normalisée +261…
    mode: text("mode").$type<DemoMode>().notNull().default("onsite"),
    place: text("place").notNull(), // lieu précis du rendez-vous (quartier, repère) ; vide en ligne
    day: text("day").notNull(), // AAAA-MM-JJ, heure de Madagascar
    slot: text("slot").notNull(), // HH:MM
    note: text("note").notNull().default(""),
    status: text("status").$type<DemoStatus>().notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("demo_bookings_slot_idx").on(t.day, t.slot).where(sql`${t.status} <> 'cancelled'`), index("demo_bookings_day_idx").on(t.day), index("demo_bookings_phone_idx").on(t.phone)],
);

// Messages laissés depuis le site public (bulle de discussion) par un visiteur sans session : nom et numéro obligatoires.
// Le numéro est rapproché des comptes : l'administration voit si c'est un simple visiteur, un client ou un menuisier.
export const siteMessages = pgTable(
  "site_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    phone: text("phone").notNull(), // forme normalisée +261…
    message: text("message").notNull(),
    page: text("page").notNull().default(""),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // compte qui porte ce numéro, s'il existe
    role: text("role").$type<"visitor" | "client" | "menuisier" | "admin">().notNull().default("visitor"),
    status: text("status").$type<"new" | "done">().notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("site_messages_status_idx").on(t.status, t.createdAt), index("site_messages_created_idx").on(t.createdAt)],
);
