CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ride_id" uuid NOT NULL,
	"rater_id" uuid NOT NULL,
	"ratee_id" uuid NOT NULL,
	"rater_role" text NOT NULL,
	"score" integer NOT NULL,
	"review" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_ride_id_unique" UNIQUE("ride_id")
);
--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rater_id_app_users_id_fk" FOREIGN KEY ("rater_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ratee_id_app_users_id_fk" FOREIGN KEY ("ratee_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;