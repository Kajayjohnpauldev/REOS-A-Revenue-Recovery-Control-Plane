-- CreateTable
CREATE TABLE "AgentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentKey" TEXT NOT NULL,
    "allowlist" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentConfig_agentKey_key" ON "AgentConfig"("agentKey");
