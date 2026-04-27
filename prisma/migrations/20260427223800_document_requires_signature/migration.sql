-- Add requiresSignature flag to documents
ALTER TABLE "Document"
ADD COLUMN IF NOT EXISTS "requiresSignature" BOOLEAN NOT NULL DEFAULT false;

-- Add notification type for signed documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'DOCUMENT_SIGNED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_SIGNED';
  END IF;
END $$;

