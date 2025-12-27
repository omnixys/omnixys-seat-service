-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ASSIGNED', 'BLOCKED');

-- CreateTable
CREATE TABLE "section" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "capacity" INTEGER,
    "meta" JSONB NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "capacity" INTEGER,
    "meta" JSONB NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat" (
    "id" TEXT NOT NULL,
    "status" "SeatStatus" NOT NULL DEFAULT 'AVAILABLE',
    "event_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "table_id" TEXT,
    "number" INTEGER,
    "label" TEXT,
    "note" TEXT,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "rotation" DOUBLE PRECISION,
    "seat_type" TEXT,
    "guest_id" TEXT,
    "invitation_id" TEXT,
    "meta" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_assignment_log" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "seat_id" TEXT NOT NULL,
    "guest_id" TEXT,
    "invitation_id" TEXT,
    "action" TEXT NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seat_assignment_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "layout_version" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "version" BIGINT NOT NULL,
    "label" TEXT,
    "data" JSONB NOT NULL,
    "patch" JSONB,
    "inverse_patch" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "layout_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "layout_change_log" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "layout_change_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "section_event_id_idx" ON "section"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "section_event_id_name_key" ON "section"("event_id", "name");

-- CreateIndex
CREATE INDEX "table_event_id_idx" ON "table"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "table_section_id_name_key" ON "table"("section_id", "name");

-- CreateIndex
CREATE INDEX "seat_event_id_idx" ON "seat"("event_id");

-- CreateIndex
CREATE INDEX "seat_guest_id_idx" ON "seat"("guest_id");

-- CreateIndex
CREATE INDEX "seat_section_id_idx" ON "seat"("section_id");

-- CreateIndex
CREATE INDEX "seat_table_id_idx" ON "seat"("table_id");

-- CreateIndex
CREATE UNIQUE INDEX "seat_event_id_invitation_id_key" ON "seat"("event_id", "invitation_id");

-- CreateIndex
CREATE UNIQUE INDEX "seat_event_id_guest_id_key" ON "seat"("event_id", "guest_id");

-- CreateIndex
CREATE INDEX "seat_assignment_log_event_id_idx" ON "seat_assignment_log"("event_id");

-- CreateIndex
CREATE INDEX "seat_assignment_log_seat_id_idx" ON "seat_assignment_log"("seat_id");

-- CreateIndex
CREATE INDEX "layout_version_event_id_idx" ON "layout_version"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "layout_version_event_id_version_key" ON "layout_version"("event_id", "version");

-- CreateIndex
CREATE INDEX "layout_change_log_event_id_idx" ON "layout_change_log"("event_id");

-- AddForeignKey
ALTER TABLE "table" ADD CONSTRAINT "table_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat" ADD CONSTRAINT "seat_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat" ADD CONSTRAINT "seat_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
