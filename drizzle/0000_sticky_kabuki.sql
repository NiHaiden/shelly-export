CREATE TABLE "shelly_metrics" (
	"time" timestamp with time zone DEFAULT now() NOT NULL,
	"plug_id" integer NOT NULL,
	"power" real,
	"voltage" real,
	"current" real,
	"energy" real,
	"temperature" real,
	"output" integer,
	"is_valid" integer
);
--> statement-breakpoint
CREATE TABLE "shelly_plugs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"password" varchar(255),
	"switch_id" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "shelly_metrics" ADD CONSTRAINT "shelly_metrics_plug_id_shelly_plugs_id_fk" FOREIGN KEY ("plug_id") REFERENCES "public"."shelly_plugs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shelly_metrics_plug_id_time_idx" ON "shelly_metrics" USING btree ("plug_id","time");