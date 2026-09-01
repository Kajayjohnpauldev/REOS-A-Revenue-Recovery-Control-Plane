-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'test',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'operator'
);

-- CreateTable
CREATE TABLE "RawEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderIndex" INTEGER NOT NULL,
    "caseId" TEXT,
    CONSTRAINT "RawEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "lane" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" DATETIME,
    "currentState" TEXT NOT NULL,
    "failureClass" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "consentState" TEXT NOT NULL DEFAULT 'unknown',
    "proposedAction" TEXT,
    "approvalState" TEXT NOT NULL DEFAULT 'none',
    "actionResult" TEXT,
    "recoveryAttribution" INTEGER NOT NULL DEFAULT 0,
    "reversalStatus" TEXT NOT NULL DEFAULT 'none',
    "policyVersion" INTEGER,
    "reasonCode" TEXT,
    "confidence" REAL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Case_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "retryBudget" INTEGER NOT NULL,
    "amountThreshold" INTEGER NOT NULL,
    "dueAgeDays" INTEGER NOT NULL,
    "allowedChannels" TEXT NOT NULL,
    "maxDiscountPct" INTEGER NOT NULL,
    "autoApproveClasses" TEXT NOT NULL,
    "consentRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Policy_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "consentChecked" BOOLEAN NOT NULL,
    "darkPatternPassed" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ToolCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "result" JSONB,
    "allowed" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ToolCall_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HumanDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HumanDecision_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HoldoutAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    CONSTRAINT "HoldoutAssignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RawEvent_idempotencyKey_key" ON "RawEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RawEvent_caseId_idx" ON "RawEvent"("caseId");

-- CreateIndex
CREATE INDEX "RawEvent_orderIndex_idx" ON "RawEvent"("orderIndex");

-- CreateIndex
CREATE INDEX "Case_lane_idx" ON "Case"("lane");

-- CreateIndex
CREATE INDEX "Case_approvalState_idx" ON "Case"("approvalState");

-- CreateIndex
CREATE INDEX "Case_merchantId_idx" ON "Case"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_merchantId_version_key" ON "Policy"("merchantId", "version");

-- CreateIndex
CREATE INDEX "Message_caseId_idx" ON "Message"("caseId");

-- CreateIndex
CREATE INDEX "ToolCall_caseId_idx" ON "ToolCall"("caseId");

-- CreateIndex
CREATE INDEX "ToolCall_allowed_idx" ON "ToolCall"("allowed");

-- CreateIndex
CREATE INDEX "HumanDecision_caseId_idx" ON "HumanDecision"("caseId");

-- CreateIndex
CREATE INDEX "LedgerEntry_caseId_idx" ON "LedgerEntry"("caseId");

-- CreateIndex
CREATE INDEX "LedgerEntry_type_idx" ON "LedgerEntry"("type");

-- CreateIndex
CREATE UNIQUE INDEX "HoldoutAssignment_caseId_key" ON "HoldoutAssignment"("caseId");
