CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_account_user` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `card_i18n` (
	`card_id` text NOT NULL,
	`lang` text NOT NULL,
	`prompt` text NOT NULL,
	`payload_json` text NOT NULL,
	`answer_json` text NOT NULL,
	PRIMARY KEY(`card_id`, `lang`),
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `card_tags` (
	`card_id` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`card_id`, `tag`),
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_card_tags_tag` ON `card_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`type` text NOT NULL,
	`difficulty` integer NOT NULL,
	`source` text,
	`source_url` text,
	`archived` integer DEFAULT false NOT NULL,
	`content_hash` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cards_topic` ON `cards` (`topic_id`,`difficulty`);--> statement-breakpoint
CREATE TABLE `deck_i18n` (
	`deck_id` text NOT NULL,
	`lang` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	PRIMARY KEY(`deck_id`, `lang`),
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `decks` (
	`id` text PRIMARY KEY NOT NULL,
	`order_idx` integer NOT NULL,
	`cert_target` text,
	`published` integer DEFAULT false NOT NULL,
	`is_expert` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_decks_published` ON `decks` (`published`,`order_idx`);--> statement-breakpoint
CREATE TABLE `review_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`session_id` text,
	`rating` integer NOT NULL,
	`correct` integer NOT NULL,
	`elapsed_ms` integer,
	`mode` text NOT NULL,
	`reviewed_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_review_log_user_time` ON `review_log` (`user_id`,`reviewed_at`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`due` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` integer DEFAULT 0 NOT NULL,
	`scheduled_days` integer DEFAULT 0 NOT NULL,
	`learning_steps` integer DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`state` integer DEFAULT 0 NOT NULL,
	`last_review` integer,
	`total_reviews` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `card_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_due` ON `reviews` (`user_id`,`due`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `idx_session_user` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `streaks` (
	`user_id` text PRIMARY KEY NOT NULL,
	`current_streak` integer DEFAULT 0 NOT NULL,
	`longest_streak` integer DEFAULT 0 NOT NULL,
	`last_active_date` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mode` text NOT NULL,
	`deck_id` text,
	`topic_id` text,
	`config_json` text DEFAULT '{}' NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`cards_seen` integer DEFAULT 0 NOT NULL,
	`cards_correct` integer DEFAULT 0 NOT NULL,
	`result_json` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_study_sessions_user` ON `study_sessions` (`user_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `topic_i18n` (
	`topic_id` text NOT NULL,
	`lang` text NOT NULL,
	`name` text NOT NULL,
	`concept_md` text NOT NULL,
	`recap_md` text,
	PRIMARY KEY(`topic_id`, `lang`),
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`parent_id` text,
	`order_idx` integer NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_topics_deck` ON `topics` (`deck_id`,`order_idx`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `user_deck_levels` (
	`user_id` text NOT NULL,
	`deck_id` text NOT NULL,
	`level` text NOT NULL,
	`score` integer,
	`source` text NOT NULL,
	`set_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `deck_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text,
	`timezone` text DEFAULT 'Europe/Bucharest' NOT NULL,
	`ui_lang` text DEFAULT 'ro' NOT NULL,
	`content_lang` text DEFAULT 'ro' NOT NULL,
	`settings_json` text DEFAULT '{}' NOT NULL,
	`placement_done` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_topic_progress` (
	`user_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`status` text NOT NULL,
	`completed_at` integer,
	PRIMARY KEY(`user_id`, `topic_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_verification_identifier` ON `verification` (`identifier`);