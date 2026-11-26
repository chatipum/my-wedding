ALTER TABLE "guests" ADD COLUMN "nickname" text;--> statement-breakpoint
-- ผังเปลี่ยนเป็น docs/เวที4.png เลขช่องเดิมใช้ไม่ได้ ล้างให้จัดใหม่
UPDATE "guests" SET "table_index" = NULL;
