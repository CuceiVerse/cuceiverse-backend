-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "users_siiauCode_key" RENAME TO "users_siiau_code_key";
