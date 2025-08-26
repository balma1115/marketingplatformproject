-- CreateTable
CREATE TABLE "tracking_projects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "place_name" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" DATETIME,
    CONSTRAINT "tracking_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tracking_keywords" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "added_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tracking_keywords_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tracking_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tracking_rankings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "keyword_id" INTEGER NOT NULL,
    "rank" INTEGER,
    "overall_rank" INTEGER,
    "check_date" DATETIME NOT NULL,
    "ranking_type" TEXT NOT NULL DEFAULT 'organic',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tracking_rankings_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "tracking_keywords" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tracking_schedules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "schedule_name" TEXT,
    "schedule_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tracking_schedules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tracking_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tracking_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "project_id" INTEGER,
    "total_keywords" INTEGER NOT NULL,
    "completed_keywords" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tracking_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tracking_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tracking_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "blog_tracking_projects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "blog_url" TEXT NOT NULL,
    "blog_name" TEXT NOT NULL,
    "blog_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "last_tracked_at" DATETIME,
    CONSTRAINT "blog_tracking_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "blog_tracking_keywords" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "added_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blog_tracking_keywords_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "blog_tracking_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "blog_tracking_results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "keyword_id" INTEGER NOT NULL,
    "main_tab_exposed" BOOLEAN NOT NULL DEFAULT false,
    "main_tab_rank" INTEGER,
    "blog_tab_rank" INTEGER,
    "view_tab_rank" INTEGER,
    "ad_rank" INTEGER,
    "ranking_type" TEXT NOT NULL DEFAULT 'organic',
    "tracking_date" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blog_tracking_results_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "blog_tracking_keywords" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "blog_tracking_schedules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "schedule_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blog_tracking_schedules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "blog_tracking_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "tracking_projects_user_id_idx" ON "tracking_projects"("user_id");

-- CreateIndex
CREATE INDEX "tracking_projects_place_id_idx" ON "tracking_projects"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_projects_user_id_place_id_key" ON "tracking_projects"("user_id", "place_id");

-- CreateIndex
CREATE INDEX "tracking_keywords_project_id_idx" ON "tracking_keywords"("project_id");

-- CreateIndex
CREATE INDEX "tracking_keywords_keyword_idx" ON "tracking_keywords"("keyword");

-- CreateIndex
CREATE INDEX "tracking_keywords_is_active_idx" ON "tracking_keywords"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_keywords_project_id_keyword_key" ON "tracking_keywords"("project_id", "keyword");

-- CreateIndex
CREATE INDEX "tracking_rankings_keyword_id_idx" ON "tracking_rankings"("keyword_id");

-- CreateIndex
CREATE INDEX "tracking_rankings_check_date_idx" ON "tracking_rankings"("check_date");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_rankings_keyword_id_check_date_ranking_type_key" ON "tracking_rankings"("keyword_id", "check_date", "ranking_type");

-- CreateIndex
CREATE INDEX "tracking_schedules_project_id_idx" ON "tracking_schedules"("project_id");

-- CreateIndex
CREATE INDEX "tracking_schedules_is_active_idx" ON "tracking_schedules"("is_active");

-- CreateIndex
CREATE INDEX "tracking_sessions_user_id_idx" ON "tracking_sessions"("user_id");

-- CreateIndex
CREATE INDEX "tracking_sessions_status_idx" ON "tracking_sessions"("status");

-- CreateIndex
CREATE INDEX "blog_tracking_projects_user_id_idx" ON "blog_tracking_projects"("user_id");

-- CreateIndex
CREATE INDEX "blog_tracking_projects_blog_id_idx" ON "blog_tracking_projects"("blog_id");

-- CreateIndex
CREATE INDEX "blog_tracking_keywords_project_id_idx" ON "blog_tracking_keywords"("project_id");

-- CreateIndex
CREATE INDEX "blog_tracking_keywords_keyword_idx" ON "blog_tracking_keywords"("keyword");

-- CreateIndex
CREATE INDEX "blog_tracking_keywords_is_active_idx" ON "blog_tracking_keywords"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "blog_tracking_keywords_project_id_keyword_key" ON "blog_tracking_keywords"("project_id", "keyword");

-- CreateIndex
CREATE INDEX "blog_tracking_results_tracking_date_idx" ON "blog_tracking_results"("tracking_date");

-- CreateIndex
CREATE INDEX "blog_tracking_results_keyword_id_tracking_date_idx" ON "blog_tracking_results"("keyword_id", "tracking_date");

-- CreateIndex
CREATE INDEX "blog_tracking_schedules_project_id_idx" ON "blog_tracking_schedules"("project_id");

-- CreateIndex
CREATE INDEX "blog_tracking_schedules_is_active_idx" ON "blog_tracking_schedules"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "blog_tracking_schedules_project_id_schedule_time_key" ON "blog_tracking_schedules"("project_id", "schedule_time");
