CREATE TABLE "conversation_prefs" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"muted" boolean DEFAULT false NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"cleared_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "conversation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_stars" (
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "ephemeral_sec" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversation_prefs" ADD CONSTRAINT "conversation_prefs_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_prefs" ADD CONSTRAINT "conversation_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_reports" ADD CONSTRAINT "conversation_reports_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_reports" ADD CONSTRAINT "conversation_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_stars" ADD CONSTRAINT "message_stars_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_stars" ADD CONSTRAINT "message_stars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_prefs_pk" ON "conversation_prefs" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "conversation_reports_conv_idx" ON "conversation_reports" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_stars_pk" ON "message_stars" USING btree ("message_id","user_id");--> statement-breakpoint
ALTER TABLE "conversation_prefs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversation_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message_stars" ENABLE ROW LEVEL SECURITY;
