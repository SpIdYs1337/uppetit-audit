-- CreateTable
CREATE TABLE "_LocationTus" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LocationTus_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_LocationTus_B_index" ON "_LocationTus"("B");

-- AddForeignKey
ALTER TABLE "_LocationTus" ADD CONSTRAINT "_LocationTus_A_fkey" FOREIGN KEY ("A") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LocationTus" ADD CONSTRAINT "_LocationTus_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
