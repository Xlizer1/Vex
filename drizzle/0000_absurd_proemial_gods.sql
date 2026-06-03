CREATE TABLE "vex"."infractions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"moderator_id" varchar(20) NOT NULL,
	"type" varchar(10) NOT NULL,
	"reason" text NOT NULL,
	"duration" integer,
	"expires_at" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vex"."users" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"username" varchar(32) NOT NULL,
	"global_name" varchar(32),
	"discriminator" varchar(4),
	"avatar_hash" varchar,
	"banner_hash" varchar,
	"accent_color" integer,
	"bot" boolean DEFAULT false NOT NULL,
	"public_flags" integer,
	"nickname" varchar(32),
	"joined_at" timestamp,
	"premium_since" timestamp,
	"pending" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"left_at" timestamp,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vex"."infractions" ADD CONSTRAINT "infractions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "vex"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vex"."infractions" ADD CONSTRAINT "infractions_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "vex"."users"("id") ON DELETE no action ON UPDATE no action;