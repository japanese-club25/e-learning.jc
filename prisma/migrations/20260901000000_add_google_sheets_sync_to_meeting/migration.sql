-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'FAILED');

-- AlterTable: add Google Sheets sync fields to meetings
ALTER TABLE "meetings"
  ADD COLUMN "google_sheet_id"   TEXT,
  ADD COLUMN "google_sheet_name" TEXT,
  ADD COLUMN "last_synced_at"    TIMESTAMP(3),
  ADD COLUMN "sync_status"       "SyncStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "sync_error"        TEXT;
