-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "plan" TEXT NOT NULL DEFAULT 'basic',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "academy_name" TEXT,
    "academy_address" TEXT,
    "agency_id" INTEGER,
    "branch_id" INTEGER,
    "coin" DOUBLE PRECISION NOT NULL DEFAULT 100.00,
    "used_coin" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "purchased_coin" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "join_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan_expiry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "naver_ad_api_key" TEXT,
    "naver_ad_secret" TEXT,
    "naver_ad_customer_id" TEXT,
    "naver_ads_access_key" TEXT,
    "naver_ads_secret_key" TEXT,
    "naver_ads_customer_id" TEXT,
    "naver_place_id" TEXT,
    "place_name" TEXT,
    "business_name" TEXT,
    "business_number" TEXT,
    "business_address" TEXT,
    "instagram_access_token" TEXT,
    "instagram_user_id" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "approved_by" INTEGER,
    "kt_pass_verified" BOOLEAN NOT NULL DEFAULT false,
    "kt_pass_verified_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog_projects" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "blog_name" TEXT,
    "blog_url" TEXT,
    "name" TEXT NOT NULL,
    "target_blog_url" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_updated" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog_keywords" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_checked" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog_rankings" (
    "id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "check_date" TIMESTAMP(3) NOT NULL,
    "rank" INTEGER,
    "main_tab_exposed" BOOLEAN NOT NULL DEFAULT false,
    "found" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "title" TEXT,
    "total_results" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."keywords" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "location" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "search_volume" INTEGER,
    "competition" TEXT,
    "avg_cpc" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ranking_results" (
    "id" SERIAL NOT NULL,
    "keyword_id" INTEGER NOT NULL,
    "project_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "check_date" TIMESTAMP(3) NOT NULL,
    "rank" INTEGER,
    "found" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "title" TEXT,
    "type" TEXT NOT NULL DEFAULT 'organic',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."smartplaces" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "place_id" TEXT NOT NULL,
    "place_name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER,
    "category" TEXT,
    "last_updated" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "smartplaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."smartplace_keywords" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "smartplace_id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_checked" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "smartplace_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."smartplace_rankings" (
    "id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "check_date" TIMESTAMP(3) NOT NULL,
    "organic_rank" INTEGER,
    "ad_rank" INTEGER,
    "total_results" INTEGER NOT NULL DEFAULT 0,
    "top_ten_places" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "smartplace_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."smartplace_info" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "place_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER,
    "category" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "smartplace_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_generation_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "service_type" TEXT NOT NULL,
    "prompt" TEXT,
    "response" TEXT,
    "model" TEXT,
    "tokens_used" INTEGER,
    "cost_in_nyang" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_usage_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "service_type" TEXT NOT NULL,
    "endpoint" TEXT,
    "cost_in_nyang" DOUBLE PRECISION,
    "response_time" INTEGER,
    "status_code" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog_content" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toc" TEXT,
    "keywords" TEXT,
    "gpt_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tracking_projects" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "place_name" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3),

    CONSTRAINT "tracking_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tracking_keywords" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tracking_rankings" (
    "id" SERIAL NOT NULL,
    "keyword_id" INTEGER NOT NULL,
    "session_id" TEXT,
    "organic_rank" INTEGER,
    "ad_rank" INTEGER,
    "check_date" TIMESTAMP(3) NOT NULL,
    "top_ten_places" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tracking_schedules" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "schedule_name" TEXT,
    "schedule_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tracking_sessions" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "project_id" INTEGER,
    "total_keywords" INTEGER NOT NULL,
    "completed_keywords" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tracking_snapshots" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "project_id" INTEGER NOT NULL,
    "check_date" TIMESTAMP(3) NOT NULL,
    "place_name" TEXT NOT NULL,
    "category" TEXT,
    "directions" TEXT,
    "introduction" TEXT,
    "representative_keywords" TEXT,
    "business_hours" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog_tracking_projects" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "blog_url" TEXT NOT NULL,
    "blog_name" TEXT NOT NULL,
    "blog_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_tracked_at" TIMESTAMP(3),

    CONSTRAINT "blog_tracking_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog_tracking_keywords" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_tracking_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog_tracking_results" (
    "id" SERIAL NOT NULL,
    "keyword_id" INTEGER NOT NULL,
    "main_tab_exposed" BOOLEAN NOT NULL DEFAULT false,
    "main_tab_rank" INTEGER,
    "blog_tab_rank" INTEGER,
    "view_tab_rank" INTEGER,
    "ad_rank" INTEGER,
    "ranking_type" TEXT NOT NULL DEFAULT 'organic',
    "tracking_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_tracking_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog_tracking_schedules" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "schedule_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_tracking_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subjects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."branches" (
    "id" SERIAL NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "manager_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."academies" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "registration_number" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_subjects" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "academy_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."naver_ads_campaigns" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "campaign_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAUSED',
    "daily_budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "naver_ads_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."naver_ads_places" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "place_id" TEXT NOT NULL,
    "place_name" TEXT NOT NULL,
    "address" TEXT,
    "phone_number" TEXT,
    "category" TEXT,
    "description" TEXT,
    "ad_group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "naver_ads_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."naver_ads_data" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "dataType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "naver_ads_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "public"."sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "smartplaces_user_id_key" ON "public"."smartplaces"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "smartplaces_place_id_key" ON "public"."smartplaces"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "smartplace_info_place_id_key" ON "public"."smartplace_info"("place_id");

-- CreateIndex
CREATE INDEX "tracking_projects_user_id_idx" ON "public"."tracking_projects"("user_id");

-- CreateIndex
CREATE INDEX "tracking_projects_place_id_idx" ON "public"."tracking_projects"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_projects_user_id_place_id_key" ON "public"."tracking_projects"("user_id", "place_id");

-- CreateIndex
CREATE INDEX "tracking_keywords_project_id_idx" ON "public"."tracking_keywords"("project_id");

-- CreateIndex
CREATE INDEX "tracking_keywords_keyword_idx" ON "public"."tracking_keywords"("keyword");

-- CreateIndex
CREATE INDEX "tracking_keywords_is_active_idx" ON "public"."tracking_keywords"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_keywords_project_id_keyword_key" ON "public"."tracking_keywords"("project_id", "keyword");

-- CreateIndex
CREATE INDEX "tracking_rankings_keyword_id_idx" ON "public"."tracking_rankings"("keyword_id");

-- CreateIndex
CREATE INDEX "tracking_rankings_check_date_idx" ON "public"."tracking_rankings"("check_date");

-- CreateIndex
CREATE INDEX "tracking_rankings_session_id_idx" ON "public"."tracking_rankings"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_rankings_keyword_id_check_date_key" ON "public"."tracking_rankings"("keyword_id", "check_date");

-- CreateIndex
CREATE INDEX "tracking_schedules_project_id_idx" ON "public"."tracking_schedules"("project_id");

-- CreateIndex
CREATE INDEX "tracking_schedules_is_active_idx" ON "public"."tracking_schedules"("is_active");

-- CreateIndex
CREATE INDEX "tracking_sessions_user_id_idx" ON "public"."tracking_sessions"("user_id");

-- CreateIndex
CREATE INDEX "tracking_sessions_status_idx" ON "public"."tracking_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_snapshots_session_id_key" ON "public"."tracking_snapshots"("session_id");

-- CreateIndex
CREATE INDEX "tracking_snapshots_project_id_idx" ON "public"."tracking_snapshots"("project_id");

-- CreateIndex
CREATE INDEX "tracking_snapshots_check_date_idx" ON "public"."tracking_snapshots"("check_date");

-- CreateIndex
CREATE INDEX "blog_tracking_projects_user_id_idx" ON "public"."blog_tracking_projects"("user_id");

-- CreateIndex
CREATE INDEX "blog_tracking_projects_blog_id_idx" ON "public"."blog_tracking_projects"("blog_id");

-- CreateIndex
CREATE INDEX "blog_tracking_keywords_project_id_idx" ON "public"."blog_tracking_keywords"("project_id");

-- CreateIndex
CREATE INDEX "blog_tracking_keywords_keyword_idx" ON "public"."blog_tracking_keywords"("keyword");

-- CreateIndex
CREATE INDEX "blog_tracking_keywords_is_active_idx" ON "public"."blog_tracking_keywords"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "blog_tracking_keywords_project_id_keyword_key" ON "public"."blog_tracking_keywords"("project_id", "keyword");

-- CreateIndex
CREATE INDEX "blog_tracking_results_tracking_date_idx" ON "public"."blog_tracking_results"("tracking_date");

-- CreateIndex
CREATE INDEX "blog_tracking_results_keyword_id_tracking_date_idx" ON "public"."blog_tracking_results"("keyword_id", "tracking_date");

-- CreateIndex
CREATE INDEX "blog_tracking_schedules_project_id_idx" ON "public"."blog_tracking_schedules"("project_id");

-- CreateIndex
CREATE INDEX "blog_tracking_schedules_is_active_idx" ON "public"."blog_tracking_schedules"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "blog_tracking_schedules_project_id_schedule_time_key" ON "public"."blog_tracking_schedules"("project_id", "schedule_time");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_key" ON "public"."subjects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_key" ON "public"."subjects"("code");

-- CreateIndex
CREATE INDEX "branches_subject_id_idx" ON "public"."branches"("subject_id");

-- CreateIndex
CREATE INDEX "branches_manager_id_idx" ON "public"."branches"("manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_subject_id_name_key" ON "public"."branches"("subject_id", "name");

-- CreateIndex
CREATE INDEX "academies_branch_id_idx" ON "public"."academies"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "academies_branch_id_name_key" ON "public"."academies"("branch_id", "name");

-- CreateIndex
CREATE INDEX "user_subjects_user_id_idx" ON "public"."user_subjects"("user_id");

-- CreateIndex
CREATE INDEX "user_subjects_subject_id_idx" ON "public"."user_subjects"("subject_id");

-- CreateIndex
CREATE INDEX "user_subjects_branch_id_idx" ON "public"."user_subjects"("branch_id");

-- CreateIndex
CREATE INDEX "user_subjects_academy_id_idx" ON "public"."user_subjects"("academy_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_subjects_user_id_subject_id_key" ON "public"."user_subjects"("user_id", "subject_id");

-- CreateIndex
CREATE INDEX "naver_ads_campaigns_user_id_idx" ON "public"."naver_ads_campaigns"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "naver_ads_campaigns_user_id_campaign_id_key" ON "public"."naver_ads_campaigns"("user_id", "campaign_id");

-- CreateIndex
CREATE INDEX "naver_ads_places_user_id_idx" ON "public"."naver_ads_places"("user_id");

-- CreateIndex
CREATE INDEX "naver_ads_places_place_id_idx" ON "public"."naver_ads_places"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "naver_ads_places_user_id_place_id_key" ON "public"."naver_ads_places"("user_id", "place_id");

-- CreateIndex
CREATE INDEX "naver_ads_data_userId_idx" ON "public"."naver_ads_data"("userId");

-- CreateIndex
CREATE INDEX "naver_ads_data_dataType_idx" ON "public"."naver_ads_data"("dataType");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_projects" ADD CONSTRAINT "blog_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_keywords" ADD CONSTRAINT "blog_keywords_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."blog_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_rankings" ADD CONSTRAINT "blog_rankings_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "public"."blog_keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."keywords" ADD CONSTRAINT "keywords_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."keywords" ADD CONSTRAINT "keywords_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."blog_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ranking_results" ADD CONSTRAINT "ranking_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ranking_results" ADD CONSTRAINT "ranking_results_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."blog_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ranking_results" ADD CONSTRAINT "ranking_results_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."smartplaces" ADD CONSTRAINT "smartplaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."smartplace_keywords" ADD CONSTRAINT "smartplace_keywords_smartplace_id_fkey" FOREIGN KEY ("smartplace_id") REFERENCES "public"."smartplaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."smartplace_rankings" ADD CONSTRAINT "smartplace_rankings_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "public"."smartplace_keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."smartplace_info" ADD CONSTRAINT "smartplace_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_generation_logs" ADD CONSTRAINT "ai_generation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_usage_logs" ADD CONSTRAINT "api_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_content" ADD CONSTRAINT "blog_content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking_projects" ADD CONSTRAINT "tracking_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking_keywords" ADD CONSTRAINT "tracking_keywords_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."tracking_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking_rankings" ADD CONSTRAINT "tracking_rankings_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "public"."tracking_keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking_schedules" ADD CONSTRAINT "tracking_schedules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."tracking_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking_sessions" ADD CONSTRAINT "tracking_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."tracking_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking_sessions" ADD CONSTRAINT "tracking_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking_snapshots" ADD CONSTRAINT "tracking_snapshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."tracking_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking_snapshots" ADD CONSTRAINT "tracking_snapshots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."tracking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_tracking_projects" ADD CONSTRAINT "blog_tracking_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_tracking_keywords" ADD CONSTRAINT "blog_tracking_keywords_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."blog_tracking_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_tracking_results" ADD CONSTRAINT "blog_tracking_results_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "public"."blog_tracking_keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_tracking_schedules" ADD CONSTRAINT "blog_tracking_schedules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."blog_tracking_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branches" ADD CONSTRAINT "branches_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branches" ADD CONSTRAINT "branches_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."academies" ADD CONSTRAINT "academies_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_subjects" ADD CONSTRAINT "user_subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_subjects" ADD CONSTRAINT "user_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_subjects" ADD CONSTRAINT "user_subjects_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_subjects" ADD CONSTRAINT "user_subjects_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "public"."academies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."naver_ads_campaigns" ADD CONSTRAINT "naver_ads_campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."naver_ads_places" ADD CONSTRAINT "naver_ads_places_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."naver_ads_data" ADD CONSTRAINT "naver_ads_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
