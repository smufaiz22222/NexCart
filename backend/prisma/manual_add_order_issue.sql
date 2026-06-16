ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE "InventoryChangeReason" ADD VALUE IF NOT EXISTS 'CANCELLATION';
ALTER TYPE "InventoryChangeReason" ADD VALUE IF NOT EXISTS 'CUSTOMER_RETURN';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURN_COMPLETED';

DO $$
BEGIN
  CREATE TYPE "OrderIssueType" AS ENUM ('RETURN', 'REFUND', 'DISPUTE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "OrderIssueStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "OrderIssueResolution" AS ENUM ('NONE', 'REFUND', 'REPLACEMENT', 'STORE_CREDIT', 'RETURNLESS_REFUND');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OrderIssue" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT,
  "requesterId" TEXT NOT NULL,
  "type" "OrderIssueType" NOT NULL,
  "status" "OrderIssueStatus" NOT NULL DEFAULT 'OPEN',
  "preferredResolution" "OrderIssueResolution" NOT NULL DEFAULT 'NONE',
  "finalResolution" "OrderIssueResolution" NOT NULL DEFAULT 'NONE',
  "reason" TEXT NOT NULL,
  "description" TEXT,
  "requestedQuantity" INTEGER NOT NULL DEFAULT 1,
  "refundAmount" DECIMAL(10,2),
  "sellerResponse" TEXT,
  "inventoryAdjusted" BOOLEAN NOT NULL DEFAULT false,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderIssue_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderIssue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderIssue_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OrderIssue_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrderIssue_orderId_idx" ON "OrderIssue"("orderId");
CREATE INDEX IF NOT EXISTS "OrderIssue_orderItemId_idx" ON "OrderIssue"("orderItemId");
CREATE INDEX IF NOT EXISTS "OrderIssue_requesterId_idx" ON "OrderIssue"("requesterId");
CREATE INDEX IF NOT EXISTS "OrderIssue_status_idx" ON "OrderIssue"("status");
CREATE INDEX IF NOT EXISTS "OrderIssue_type_idx" ON "OrderIssue"("type");
CREATE INDEX IF NOT EXISTS "OrderIssue_createdAt_idx" ON "OrderIssue"("createdAt");
