CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."reservation_type" AS ENUM('walk_in', 'advance');--> statement-breakpoint
CREATE TYPE "public"."seat_type" AS ENUM('standard', 'study_room', 'computer_desk', 'reading_table');--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."reservation_status";--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "status" SET DATA TYPE "public"."reservation_status" USING "status"::"public"."reservation_status";--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "reservation_type" SET DEFAULT 'walk_in'::"public"."reservation_type";--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "reservation_type" SET DATA TYPE "public"."reservation_type" USING "reservation_type"::"public"."reservation_type";--> statement-breakpoint
ALTER TABLE "seats" ALTER COLUMN "seat_type" SET DEFAULT 'standard'::"public"."seat_type";--> statement-breakpoint
ALTER TABLE "seats" ALTER COLUMN "seat_type" SET DATA TYPE "public"."seat_type" USING "seat_type"::"public"."seat_type";--> statement-breakpoint
ALTER TABLE "seats" ALTER COLUMN "facilities" SET DATA TYPE jsonb USING facilities::jsonb;--> statement-breakpoint
ALTER TABLE "zones" ALTER COLUMN "layout_objects" SET DATA TYPE jsonb USING layout_objects::jsonb;--> statement-breakpoint
CREATE INDEX "reservations_seat_id_idx" ON "reservations" USING btree ("seat_id");--> statement-breakpoint
CREATE INDEX "reservations_user_id_idx" ON "reservations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reservations_status_idx" ON "reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reservations_start_time_idx" ON "reservations" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "reservations_end_time_idx" ON "reservations" USING btree ("end_time");--> statement-breakpoint
CREATE INDEX "seats_zone_id_idx" ON "seats" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "seats_is_available_idx" ON "seats" USING btree ("is_available");--> statement-breakpoint
CREATE INDEX "seats_seat_type_idx" ON "seats" USING btree ("seat_type");--> statement-breakpoint
CREATE INDEX "zones_floor_idx" ON "zones" USING btree ("floor");--> statement-breakpoint
CREATE INDEX "zones_is_active_idx" ON "zones" USING btree ("is_active");