-- Add indexes for tenant-scoped workflow queries and run history lookups

ALTER TABLE "Workflow" ADD COLUMN "webhookToken" TEXT;
CREATE UNIQUE INDEX "Workflow_webhookToken_key" ON "Workflow"("webhookToken");
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "User_tenantId_role_idx" ON "User"("tenantId", "role");
CREATE INDEX "Workflow_tenantId_idx" ON "Workflow"("tenantId");
CREATE INDEX "Workflow_tenantId_name_idx" ON "Workflow"("tenantId", "name");
CREATE INDEX "Workflow_tenantId_createdAt_idx" ON "Workflow"("tenantId", "createdAt");
CREATE INDEX "WorkflowVersion_workflowId_createdAt_idx" ON "WorkflowVersion"("workflowId", "createdAt");
CREATE INDEX "WorkflowRun_tenantId_workflowId_status_idx" ON "WorkflowRun"("tenantId", "workflowId", "status");
CREATE INDEX "WorkflowRun_tenantId_createdAt_idx" ON "WorkflowRun"("tenantId", "createdAt");
CREATE INDEX "WorkflowRun_workflowId_createdAt_idx" ON "WorkflowRun"("workflowId", "createdAt");
CREATE INDEX "StepRun_tenantId_workflowRunId_idx" ON "StepRun"("tenantId", "workflowRunId");
CREATE INDEX "StepRun_tenantId_status_idx" ON "StepRun"("tenantId", "status");
CREATE INDEX "StepRun_workflowRunId_createdAt_idx" ON "StepRun"("workflowRunId", "createdAt");
CREATE INDEX "Log_createdAt_idx" ON "Log"("createdAt");
