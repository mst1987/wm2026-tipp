-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "details_json" JSONB,
ADD COLUMN     "details_synced_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "api_call_logs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'api-football',
    "endpoint" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_call_logs_created_at_idx" ON "api_call_logs"("created_at");
