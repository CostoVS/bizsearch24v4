CREATE TABLE "ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"province" varchar(100) NOT NULL,
	"location" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"is_premium" boolean DEFAULT false,
	"is_sponsor" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'USER' NOT NULL,
	"plan" varchar(50) DEFAULT 'FREE' NOT NULL,
	"password_hash" varchar(255),
	"last_login_ip" varchar(45),
	"device_info" text,
	"location" varchar(255),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ads" ADD CONSTRAINT "ads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;