-- Custom migration: FTS5 search over tokens (lemma/text), notes (title/body),
-- and journal_entries (uk). Hand-written — drizzle-kit cannot model virtual
-- tables or triggers.
--
-- Tokenizer decision (UT03, ADR-0004; inherits Sumrak T03's design):
-- `unicode61` handles Cyrillic fine (full Unicode case folding at
-- tokenization — a query for «їжак» finds «ЇЖАК» with no help from us), so
-- the trigger side lowercases nothing (SQLite's lower() is ASCII-only anyway).
-- What unicode61 cannot do is the Ukrainian tolerance the app promises
-- (ADR-0004): it treats the ASCII apostrophe U+0027 and the typographic
-- U+2019 as PUNCTUATION, splitting «п'ять» into «п» + «ять», while the
-- modifier-letter apostrophe U+02BC is a letter and keeps «пʼять» whole; and
-- it never folds ґ→г (verified empirically, UT03). Tolerance is therefore
-- achieved by indexing normalized shadow text instead of the stored text:
--   - tokens_fts indexes tokens.lemma_norm / tokens.text_norm (already
--     folded by the importer in JS via normalizeUk: NFC, lowercase,
--     every apostrophe variant → U+02BC, ґ → г);
--   - notes_fts / journal_fts apply the same folds in the triggers with a
--     replace() chain (apostrophes ' ’ ` ´ → ʼ, Ґ/ґ → Г/г);
--   - query strings are normalized the same way in the repositories
--     (toFtsQuery), so a query «п'ять» becomes the term "пʼять" and matches.
-- Stored content text is never mutated (roadmap §3): the author's apostrophe
-- and ґ live on in the content/user tables; only the search index is folded.
--
-- Each FTS table mirrors its content table's rowid so triggers can delete by
-- rowid; the FTS tables are standalone (no content= option) because the
-- indexed text intentionally differs from the stored text.
CREATE VIRTUAL TABLE `tokens_fts` USING fts5(`lemma`, `text`, tokenize = 'unicode61');
--> statement-breakpoint
CREATE TRIGGER `tokens_fts_ai` AFTER INSERT ON `tokens` BEGIN
  INSERT INTO `tokens_fts`(rowid, `lemma`, `text`)
  VALUES (new.rowid, new.`lemma_norm`, new.`text_norm`);
END;
--> statement-breakpoint
CREATE TRIGGER `tokens_fts_ad` AFTER DELETE ON `tokens` BEGIN
  DELETE FROM `tokens_fts` WHERE rowid = old.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `tokens_fts_au` AFTER UPDATE ON `tokens` BEGIN
  DELETE FROM `tokens_fts` WHERE rowid = old.rowid;
  INSERT INTO `tokens_fts`(rowid, `lemma`, `text`)
  VALUES (new.rowid, new.`lemma_norm`, new.`text_norm`);
END;
--> statement-breakpoint
CREATE VIRTUAL TABLE `notes_fts` USING fts5(`title`, `body`, tokenize = 'unicode61');
--> statement-breakpoint
CREATE TRIGGER `notes_fts_ai` AFTER INSERT ON `notes` BEGIN
  INSERT INTO `notes_fts`(rowid, `title`, `body`)
  VALUES (new.rowid,
    replace(replace(replace(replace(replace(replace(new.`title`, '''', 'ʼ'), '’', 'ʼ'), '`', 'ʼ'), '´', 'ʼ'), 'Ґ', 'Г'), 'ґ', 'г'),
    replace(replace(replace(replace(replace(replace(new.`body`, '''', 'ʼ'), '’', 'ʼ'), '`', 'ʼ'), '´', 'ʼ'), 'Ґ', 'Г'), 'ґ', 'г'));
END;
--> statement-breakpoint
CREATE TRIGGER `notes_fts_ad` AFTER DELETE ON `notes` BEGIN
  DELETE FROM `notes_fts` WHERE rowid = old.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `notes_fts_au` AFTER UPDATE ON `notes` BEGIN
  DELETE FROM `notes_fts` WHERE rowid = old.rowid;
  INSERT INTO `notes_fts`(rowid, `title`, `body`)
  VALUES (new.rowid,
    replace(replace(replace(replace(replace(replace(new.`title`, '''', 'ʼ'), '’', 'ʼ'), '`', 'ʼ'), '´', 'ʼ'), 'Ґ', 'Г'), 'ґ', 'г'),
    replace(replace(replace(replace(replace(replace(new.`body`, '''', 'ʼ'), '’', 'ʼ'), '`', 'ʼ'), '´', 'ʼ'), 'Ґ', 'Г'), 'ґ', 'г'));
END;
--> statement-breakpoint
CREATE VIRTUAL TABLE `journal_fts` USING fts5(`uk`, tokenize = 'unicode61');
--> statement-breakpoint
CREATE TRIGGER `journal_fts_ai` AFTER INSERT ON `journal_entries` BEGIN
  INSERT INTO `journal_fts`(rowid, `uk`)
  VALUES (new.rowid,
    replace(replace(replace(replace(replace(replace(new.`uk`, '''', 'ʼ'), '’', 'ʼ'), '`', 'ʼ'), '´', 'ʼ'), 'Ґ', 'Г'), 'ґ', 'г'));
END;
--> statement-breakpoint
CREATE TRIGGER `journal_fts_ad` AFTER DELETE ON `journal_entries` BEGIN
  DELETE FROM `journal_fts` WHERE rowid = old.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `journal_fts_au` AFTER UPDATE ON `journal_entries` BEGIN
  DELETE FROM `journal_fts` WHERE rowid = old.rowid;
  INSERT INTO `journal_fts`(rowid, `uk`)
  VALUES (new.rowid,
    replace(replace(replace(replace(replace(replace(new.`uk`, '''', 'ʼ'), '’', 'ʼ'), '`', 'ʼ'), '´', 'ʼ'), 'Ґ', 'Г'), 'ґ', 'г'));
END;
