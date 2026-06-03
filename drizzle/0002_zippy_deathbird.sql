ALTER TABLE "vex"."users" ADD COLUMN "frags" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "vex"."users" ADD COLUMN "last_daily_at" timestamp;--> statement-breakpoint
ALTER TABLE "vex"."users" ADD COLUMN "last_message_frag_at" timestamp;