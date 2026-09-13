CREATE TABLE `audio_tracks` (
	`pack_id` text NOT NULL,
	`story_id` text NOT NULL,
	`id` text NOT NULL,
	`voice` text NOT NULL,
	`style` text NOT NULL,
	`file` text NOT NULL,
	`local_uri` text,
	`duration_ms` integer NOT NULL,
	PRIMARY KEY(`pack_id`, `story_id`, `id`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dialogue_choices` (
	`pack_id` text NOT NULL,
	`dialogue_id` text NOT NULL,
	`node_id` text NOT NULL,
	`id` text NOT NULL,
	`order_idx` integer NOT NULL,
	`sentence_id` text NOT NULL,
	`next_node_id` text NOT NULL,
	`asr_alternates` text,
	`hint_uk` text,
	`hint_en` text,
	PRIMARY KEY(`pack_id`, `dialogue_id`, `node_id`, `id`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dialogue_choices_node_idx` ON `dialogue_choices` (`pack_id`,`dialogue_id`,`node_id`,`order_idx`);--> statement-breakpoint
CREATE TABLE `dialogue_endings` (
	`pack_id` text NOT NULL,
	`dialogue_id` text NOT NULL,
	`id` text NOT NULL,
	`title_uk` text NOT NULL,
	`title_en` text NOT NULL,
	`recap_uk` text NOT NULL,
	`recap_en` text NOT NULL,
	`tone` text NOT NULL,
	PRIMARY KEY(`pack_id`, `dialogue_id`, `id`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dialogue_node_audio` (
	`pack_id` text NOT NULL,
	`dialogue_id` text NOT NULL,
	`node_id` text NOT NULL,
	`choice_id` text,
	`sentence_id` text NOT NULL,
	`file` text NOT NULL,
	`local_uri` text,
	`duration_ms` integer NOT NULL,
	PRIMARY KEY(`pack_id`, `sentence_id`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dialogue_node_audio_dialogue_idx` ON `dialogue_node_audio` (`pack_id`,`dialogue_id`);--> statement-breakpoint
CREATE TABLE `dialogue_node_stamps` (
	`pack_id` text NOT NULL,
	`sentence_id` text NOT NULL,
	`stamp_index` integer NOT NULL,
	`token_index` integer NOT NULL,
	`start_ms` integer NOT NULL,
	`end_ms` integer NOT NULL,
	PRIMARY KEY(`pack_id`, `sentence_id`, `stamp_index`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dialogue_nodes` (
	`pack_id` text NOT NULL,
	`dialogue_id` text NOT NULL,
	`id` text NOT NULL,
	`order_idx` integer NOT NULL,
	`speaker_id` text NOT NULL,
	`sentence_id` text NOT NULL,
	`kind` text NOT NULL,
	`next_node_id` text,
	`ending_id` text,
	PRIMARY KEY(`pack_id`, `dialogue_id`, `id`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dialogue_nodes_dialogue_idx` ON `dialogue_nodes` (`pack_id`,`dialogue_id`,`order_idx`);--> statement-breakpoint
CREATE TABLE `dialogues` (
	`pack_id` text NOT NULL,
	`id` text NOT NULL,
	`order_idx` integer NOT NULL,
	`title_uk` text NOT NULL,
	`title_en` text NOT NULL,
	`level` text NOT NULL,
	`start_node_id` text NOT NULL,
	`characters` text NOT NULL,
	PRIMARY KEY(`pack_id`, `id`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dialogues_id_idx` ON `dialogues` (`id`);--> statement-breakpoint
CREATE TABLE `exercise_specs` (
	`pack_id` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`order_idx` integer NOT NULL,
	`spec` text NOT NULL,
	PRIMARY KEY(`pack_id`, `id`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `journal_prompts` (
	`pack_id` text NOT NULL,
	`id` text NOT NULL,
	`level` text NOT NULL,
	`prompt_uk` text NOT NULL,
	`prompt_en` text NOT NULL,
	`tags` text,
	PRIMARY KEY(`pack_id`, `id`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`pack_id` text NOT NULL,
	`id` text NOT NULL,
	`title_uk` text NOT NULL,
	`title_en` text NOT NULL,
	`body` text NOT NULL,
	`grammar_topics` text,
	PRIMARY KEY(`pack_id`, `id`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `packs` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`type` text NOT NULL,
	`title_uk` text NOT NULL,
	`title_en` text NOT NULL,
	`level` text NOT NULL,
	`tags` text NOT NULL,
	`imported_at` integer NOT NULL,
	`origin` text DEFAULT 'remote' NOT NULL,
	`theme_scene` text,
	`theme_accent` text,
	`track` text
);
--> statement-breakpoint
CREATE TABLE `sentences` (
	`pack_id` text NOT NULL,
	`id` text NOT NULL,
	`story_id` text NOT NULL,
	`order_idx` integer NOT NULL,
	`uk` text NOT NULL,
	`en` text NOT NULL,
	`grammar_topics` text,
	PRIMARY KEY(`pack_id`, `id`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sentences_story_idx` ON `sentences` (`pack_id`,`story_id`,`order_idx`);--> statement-breakpoint
CREATE INDEX `sentences_id_idx` ON `sentences` (`id`);--> statement-breakpoint
CREATE TABLE `stories` (
	`pack_id` text NOT NULL,
	`id` text NOT NULL,
	`order_idx` integer NOT NULL,
	`title_uk` text NOT NULL,
	`title_en` text NOT NULL,
	`level` text NOT NULL,
	PRIMARY KEY(`pack_id`, `id`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stories_id_idx` ON `stories` (`id`);--> statement-breakpoint
CREATE TABLE `tokens` (
	`pack_id` text NOT NULL,
	`sentence_id` text NOT NULL,
	`token_index` integer NOT NULL,
	`story_id` text NOT NULL,
	`text` text NOT NULL,
	`text_norm` text NOT NULL,
	`is_punct` integer DEFAULT false NOT NULL,
	`space_before` integer NOT NULL,
	`lemma` text,
	`lemma_norm` text,
	`translation` text,
	`pos` text,
	`grammar` text,
	`level` text,
	`note` text,
	PRIMARY KEY(`pack_id`, `sentence_id`, `token_index`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tokens_lemma_norm_idx` ON `tokens` (`lemma_norm`);--> statement-breakpoint
CREATE INDEX `tokens_story_idx` ON `tokens` (`pack_id`,`story_id`,`token_index`);--> statement-breakpoint
CREATE INDEX `tokens_level_lemma_idx` ON `tokens` (`lemma_norm`,`level`) WHERE is_punct = 0 AND lemma_norm IS NOT NULL AND level IS NOT NULL;--> statement-breakpoint
CREATE TABLE `word_stamps` (
	`pack_id` text NOT NULL,
	`story_id` text NOT NULL,
	`track_id` text NOT NULL,
	`stamp_index` integer NOT NULL,
	`sentence_id` text NOT NULL,
	`token_index` integer NOT NULL,
	`start_ms` integer NOT NULL,
	`end_ms` integer NOT NULL,
	PRIMARY KEY(`pack_id`, `story_id`, `track_id`, `stamp_index`),
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `word_stamps_time_idx` ON `word_stamps` (`pack_id`,`story_id`,`track_id`,`start_ms`);--> statement-breakpoint
CREATE TABLE `achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`unlocked_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event` text NOT NULL,
	`props` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytics_events_event_idx` ON `analytics_events` (`event`,`created_at`);--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bank_items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`lemma` text,
	`lemma_norm` text,
	`surface` text NOT NULL,
	`normalized` text NOT NULL,
	`translation` text NOT NULL,
	`grammar` text,
	`pos` text,
	`level` text,
	`source_sentence_id` text,
	`source_story_id` text,
	`note` text,
	`needs_enrichment` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bank_items_word_lemma_uq` ON `bank_items` (`lemma_norm`) WHERE kind = 'word' AND lemma_norm IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `bank_items_phrase_norm_uq` ON `bank_items` (`normalized`) WHERE kind = 'phrase';--> statement-breakpoint
CREATE INDEX `bank_items_created_idx` ON `bank_items` (`created_at`);--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`pack_id` text NOT NULL,
	`story_id` text NOT NULL,
	`sentence_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookmarks_story_uq` ON `bookmarks` (`pack_id`,`story_id`) WHERE kind = 'story';--> statement-breakpoint
CREATE UNIQUE INDEX `bookmarks_sentence_uq` ON `bookmarks` (`pack_id`,`sentence_id`) WHERE kind = 'sentence';--> statement-breakpoint
CREATE INDEX `bookmarks_created_idx` ON `bookmarks` (`created_at`);--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`bank_item_id` text NOT NULL,
	`direction` text NOT NULL,
	`due_at` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` real NOT NULL,
	`scheduled_days` real NOT NULL,
	`learning_steps` integer NOT NULL,
	`reps` integer NOT NULL,
	`lapses` integer NOT NULL,
	`state` integer NOT NULL,
	`last_review_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`bank_item_id`) REFERENCES `bank_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cards_item_direction_uq` ON `cards` (`bank_item_id`,`direction`);--> statement-breakpoint
CREATE INDEX `cards_due_idx` ON `cards` (`due_at`);--> statement-breakpoint
CREATE TABLE `checkpoint_results` (
	`id` text PRIMARY KEY NOT NULL,
	`checkpoint_pack_id` text NOT NULL,
	`score_percent` real NOT NULL,
	`passed` integer NOT NULL,
	`detail` text,
	`completed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_activity` (
	`date` text PRIMARY KEY NOT NULL,
	`reviews_done` integer DEFAULT 0 NOT NULL,
	`reading_ms` integer DEFAULT 0 NOT NULL,
	`stories_finished` integer DEFAULT 0 NOT NULL,
	`goal_met_at` integer,
	`xp` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dialogue_endings_seen` (
	`dialogue_id` text NOT NULL,
	`ending_id` text NOT NULL,
	`first_seen_at` integer NOT NULL,
	PRIMARY KEY(`dialogue_id`, `ending_id`)
);
--> statement-breakpoint
CREATE TABLE `dialogue_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`dialogue_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`ending_id` text,
	`path_json` text NOT NULL,
	`spoken_score_avg` real
);
--> statement-breakpoint
CREATE INDEX `dialogue_runs_dialogue_idx` ON `dialogue_runs` (`dialogue_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `encounters` (
	`id` text PRIMARY KEY NOT NULL,
	`bank_item_id` text NOT NULL,
	`sentence_id` text,
	`journal_entry_id` text,
	`surface` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`bank_item_id`) REFERENCES `bank_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `encounters_bank_item_idx` ON `encounters` (`bank_item_id`);--> statement-breakpoint
CREATE TABLE `frozen_days` (
	`date` text PRIMARY KEY NOT NULL,
	`consumed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `game_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`item_count` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`detail` text
);
--> statement-breakpoint
CREATE INDEX `game_sessions_started_idx` ON `game_sessions` (`started_at`);--> statement-breakpoint
CREATE TABLE `import_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`title` text NOT NULL,
	`source_label` text,
	`status` text NOT NULL,
	`annotation_json` text,
	`error` text,
	`pack_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `import_requests_status_idx` ON `import_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `imported_packs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`source_label` text,
	`pack_json_gz` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text,
	`uk` text NOT NULL,
	`ai_feedback` text,
	`feedback_status` text DEFAULT 'none' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `journal_entries_created_idx` ON `journal_entries` (`created_at`);--> statement-breakpoint
CREATE INDEX `journal_entries_updated_idx` ON `journal_entries` (`updated_at`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notes_updated_idx` ON `notes` (`updated_at`);--> statement-breakpoint
CREATE TABLE `review_log` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`rating` integer NOT NULL,
	`state` integer NOT NULL,
	`due_at` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` real NOT NULL,
	`last_elapsed_days` real NOT NULL,
	`scheduled_days` real NOT NULL,
	`learning_steps` integer NOT NULL,
	`reviewed_at` integer NOT NULL,
	`duration_ms` integer,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `review_log_card_idx` ON `review_log` (`card_id`,`reviewed_at`);--> statement-breakpoint
CREATE INDEX `review_log_reviewed_at_idx` ON `review_log` (`reviewed_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `story_progress` (
	`pack_id` text NOT NULL,
	`story_id` text NOT NULL,
	`current_sentence_idx` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`finished_at` integer,
	PRIMARY KEY(`pack_id`, `story_id`)
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`pack_id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`source` text NOT NULL,
	`installed_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`bytes` integer
);
--> statement-breakpoint
CREATE TABLE `unit_progress` (
	`pack_id` text PRIMARY KEY NOT NULL,
	`lesson_read_at` integer,
	`quiz_passed_at` integer,
	`quiz_best_score_percent` real,
	`completed_at` integer,
	`updated_at` integer NOT NULL
);
