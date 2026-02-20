ALTER TABLE "seats" ADD COLUMN "x" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "seats" ADD COLUMN "y" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "seats" DROP COLUMN "position_x";--> statement-breakpoint
ALTER TABLE "seats" DROP COLUMN "position_y";--> statement-breakpoint
ALTER TABLE "seats" DROP COLUMN "position_z";--> statement-breakpoint
ALTER TABLE "seats" DROP COLUMN "rotation";--> statement-breakpoint
ALTER TABLE "zones" DROP COLUMN "color";--> statement-breakpoint
ALTER TABLE "zones" DROP COLUMN "bounding_box";