-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "distance" DOUBLE PRECISION,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "radius" INTEGER NOT NULL DEFAULT 150;
