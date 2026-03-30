-- CreateTable
CREATE TABLE "backup_settings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "intervalHours" INTEGER NOT NULL DEFAULT 6,
    "maxStorageMb" INTEGER NOT NULL DEFAULT 300,
    "lastBackupAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_settings_pkey" PRIMARY KEY ("id")
);
