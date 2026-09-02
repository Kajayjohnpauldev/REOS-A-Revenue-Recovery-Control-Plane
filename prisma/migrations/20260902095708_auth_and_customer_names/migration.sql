-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "lane" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL DEFAULT '',
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
INSERT INTO "new_Case" ("actionResult", "amount", "approvalState", "attemptCount", "confidence", "consentState", "createdAt", "currency", "currentState", "dueAt", "entityId", "entityType", "failureClass", "id", "lane", "merchantId", "policyVersion", "proposedAction", "reasonCode", "recoveryAttribution", "reversalStatus", "updatedAt") SELECT "actionResult", "amount", "approvalState", "attemptCount", "confidence", "consentState", "createdAt", "currency", "currentState", "dueAt", "entityId", "entityType", "failureClass", "id", "lane", "merchantId", "policyVersion", "proposedAction", "reasonCode", "recoveryAttribution", "reversalStatus", "updatedAt" FROM "Case";
DROP TABLE "Case";
ALTER TABLE "new_Case" RENAME TO "Case";
CREATE INDEX "Case_lane_idx" ON "Case"("lane");
CREATE INDEX "Case_approvalState_idx" ON "Case"("approvalState");
CREATE INDEX "Case_merchantId_idx" ON "Case"("merchantId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'operator',
    "title" TEXT,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("email", "id", "name", "role") SELECT "email", "id", "name", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
