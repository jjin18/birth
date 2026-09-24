CREATE TABLE `opened_fortunes` (
	`id` integer PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`opened_by` text NOT NULL,
	`opened_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `opened_fortunes_request_id_unique` ON `opened_fortunes` (`request_id`);