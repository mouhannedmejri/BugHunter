-- Scope groups per program + optional asset linkage
CREATE TABLE "ProgramScopeGroup" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "triageOptions" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "rewardPolicy" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProgramScopeGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProgramScopeGroup_programId_name_key"
  ON "ProgramScopeGroup"("programId", "name");
CREATE INDEX "ProgramScopeGroup_programId_idx"
  ON "ProgramScopeGroup"("programId");

ALTER TABLE "ProgramScopeGroup"
  ADD CONSTRAINT "ProgramScopeGroup_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "Program"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Asset" ADD COLUMN "scopeGroupId" TEXT;
CREATE INDEX "Asset_scopeGroupId_idx" ON "Asset"("scopeGroupId");
ALTER TABLE "Asset"
  ADD CONSTRAINT "Asset_scopeGroupId_fkey"
  FOREIGN KEY ("scopeGroupId") REFERENCES "ProgramScopeGroup"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: create a default in-scope group for existing programs
INSERT INTO "ProgramScopeGroup" (
  "id", "programId", "name", "isDefault", "triageOptions", "rewardPolicy", "createdAt", "updatedAt"
)
SELECT
  CONCAT('sg_', md5("id")),
  "id",
  'Default In Scope',
  true,
  COALESCE("policy", '{}'::jsonb),
  COALESCE("rewardPolicy", '{}'::jsonb),
  NOW(),
  NOW()
FROM "Program"
WHERE "deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "ProgramScopeGroup" s
    WHERE s."programId" = "Program"."id"
      AND s."isDefault" = true
  );

-- Attach existing in-scope assets to the default group
UPDATE "Asset" a
SET "scopeGroupId" = s."id"
FROM "ProgramScopeGroup" s
WHERE s."programId" = a."programId"
  AND s."isDefault" = true
  AND a."deletedAt" IS NULL
  AND a."inScope" = true
  AND a."scopeGroupId" IS NULL;
