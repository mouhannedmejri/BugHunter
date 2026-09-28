-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateTable
CREATE TABLE "ReportEmbedding" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "dimensions" INTEGER NOT NULL DEFAULT 1536,
    "textHash" TEXT,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTriageAssessment" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "predictedSeverity" "Severity" NOT NULL,
    "cvssVector" TEXT NOT NULL,
    "cvssScore" DOUBLE PRECISION NOT NULL,
    "cweId" TEXT,
    "cweName" TEXT,
    "reasoning" TEXT NOT NULL,
    "scopeStatus" TEXT NOT NULL DEFAULT 'IN_SCOPE',
    "scopeRationale" TEXT,
    "remediationNotes" TEXT,
    "duplicateCandidateId" TEXT,
    "duplicateSimilarity" DOUBLE PRECISION,
    "duplicateRationale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTriageAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityKnowledge" (
    "id" TEXT NOT NULL,
    "cweId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "VulnCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "typicalSeverity" "Severity" NOT NULL,
    "cvssBaseVector" TEXT NOT NULL,
    "remediationTemplate" TEXT NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportEmbedding_reportId_key" ON "ReportEmbedding"("reportId");
CREATE INDEX "ReportEmbedding_programId_idx" ON "ReportEmbedding"("programId");
CREATE INDEX "ReportEmbedding_orgId_idx" ON "ReportEmbedding"("orgId");

-- Create HNSW Vector Index for Cosine Similarity search on ReportEmbedding
CREATE INDEX IF NOT EXISTS "report_embedding_hnsw_idx" ON "ReportEmbedding" USING hnsw ("embedding" vector_cosine_ops);

-- CreateIndex
CREATE UNIQUE INDEX "AiTriageAssessment_reportId_key" ON "AiTriageAssessment"("reportId");
CREATE INDEX "AiTriageAssessment_reportId_idx" ON "AiTriageAssessment"("reportId");
CREATE INDEX "AiTriageAssessment_status_idx" ON "AiTriageAssessment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityKnowledge_cweId_key" ON "SecurityKnowledge"("cweId");
CREATE INDEX "SecurityKnowledge_category_idx" ON "SecurityKnowledge"("category");

-- AddForeignKey
ALTER TABLE "ReportEmbedding" ADD CONSTRAINT "ReportEmbedding_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportEmbedding" ADD CONSTRAINT "ReportEmbedding_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTriageAssessment" ADD CONSTRAINT "AiTriageAssessment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiTriageAssessment" ADD CONSTRAINT "AiTriageAssessment_duplicateCandidateId_fkey" FOREIGN KEY ("duplicateCandidateId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
