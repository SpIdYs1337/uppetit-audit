-- CreateIndex
CREATE INDEX "Answer_auditId_idx" ON "Answer"("auditId");

-- CreateIndex
CREATE INDEX "Answer_itemId_idx" ON "Answer"("itemId");

-- CreateIndex
CREATE INDEX "Audit_locationId_idx" ON "Audit"("locationId");

-- CreateIndex
CREATE INDEX "Audit_userId_idx" ON "Audit"("userId");

-- CreateIndex
CREATE INDEX "Audit_date_idx" ON "Audit"("date");
