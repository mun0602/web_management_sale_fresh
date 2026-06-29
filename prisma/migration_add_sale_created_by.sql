ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "created_by_sale_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_created_by_sale_id_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_created_by_sale_id_fkey"
      FOREIGN KEY ("created_by_sale_id")
      REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_created_by_sale_id_idx" ON "User"("created_by_sale_id");
