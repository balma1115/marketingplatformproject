-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "plan" TEXT NOT NULL DEFAULT 'basic',
    "academy_name" TEXT,
    "academy_address" TEXT,
    "agency_id" INTEGER,
    "branch_id" INTEGER,
    "coin" REAL NOT NULL DEFAULT 100.00,
    "used_coin" REAL NOT NULL DEFAULT 0.00,
    "purchased_coin" REAL NOT NULL DEFAULT 0.00,
    "join_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan_expiry" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "blog_projects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "target_blog_url" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "blog_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "location" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "search_volume" INTEGER,
    "competition" TEXT,
    "avg_cpc" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "keywords_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "blog_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "keywords_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ranking_results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "keyword_id" INTEGER NOT NULL,
    "project_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "check_date" DATETIME NOT NULL,
    "rank" INTEGER,
    "found" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "title" TEXT,
    "type" TEXT NOT NULL DEFAULT 'organic',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ranking_results_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keywords" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ranking_results_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "blog_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ranking_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "smartplace_info" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "place_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "rating" REAL,
    "review_count" INTEGER,
    "category" TEXT,
    "last_updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "smartplace_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_generation_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "service_type" TEXT NOT NULL,
    "prompt" TEXT,
    "response" TEXT,
    "model" TEXT,
    "tokens_used" INTEGER,
    "cost_in_nyang" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_generation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "api_usage_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "service_type" TEXT NOT NULL,
    "endpoint" TEXT,
    "cost_in_nyang" REAL,
    "response_time" INTEGER,
    "status_code" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "blog_content" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toc" TEXT,
    "keywords" TEXT,
    "gpt_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "blog_content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "smartplace_info_place_id_key" ON "smartplace_info"("place_id");
