ALTER TABLE "public"."user_subjects"
ADD COLUMN IF NOT EXISTS "is_branch_manager" BOOLEAN NOT NULL DEFAULT false;