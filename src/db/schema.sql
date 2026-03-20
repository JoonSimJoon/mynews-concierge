-- MyNews Database Schema
-- 매경미디어 x 앤트로픽 'News to Action' AI 해커톤

-- 카테고리 마스터 테이블
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  large_code_id VARCHAR(10) NOT NULL,
  large_code_nm VARCHAR(50) NOT NULL,
  middle_code_id VARCHAR(10) NOT NULL,
  middle_code_nm VARCHAR(50),
  small_code_id VARCHAR(20) NOT NULL UNIQUE,
  small_code_nm VARCHAR(100) NOT NULL,
  seq INTEGER
);

-- 원본 기사 테이블
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  article_id BIGINT NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  sub_title TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  summary VARCHAR(300),
  writers VARCHAR(300),
  reg_dt TIMESTAMP,
  service_daytime TIMESTAMP NOT NULL,
  pub_div VARCHAR(2) NOT NULL DEFAULT 'W',
  main_category VARCHAR(20) NOT NULL,
  article_url VARCHAR(500),
  image_url VARCHAR(500),
  image_caption TEXT,
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_articles_service_dt ON articles(service_daytime DESC);
CREATE INDEX idx_articles_category ON articles(main_category);
CREATE INDEX idx_articles_article_id ON articles(article_id);

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 프로필 (개인 성향)
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  political_stance INTEGER NOT NULL CHECK (political_stance BETWEEN 1 AND 10),
  -- 1: 매우 진보, 5: 중도, 10: 매우 보수
  interests TEXT[] NOT NULL DEFAULT '{}',
  -- 중분류 카테고리 배열: 경제, 증권, 기업, 부동산, 정치, 사회, 국제, 문화, IT과학, 스포츠
  writing_style VARCHAR(20) NOT NULL DEFAULT 'casual',
  -- formal(격식체), casual(비격식체), concise(간결), detailed(상세)
  knowledge_level VARCHAR(20) NOT NULL DEFAULT 'general',
  -- expert(전문가), general(일반인), beginner(입문자)
  age_group VARCHAR(10),
  -- 10s, 20s, 30s, 40s, 50s, 60s+
  occupation VARCHAR(50),
  -- student, office_worker, self_employed, investor, job_seeker, etc.
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- 개인화된 기사 (Claude API 생성 결과 캐시)
CREATE TABLE IF NOT EXISTS personalized_articles (
  id SERIAL PRIMARY KEY,
  article_id BIGINT NOT NULL REFERENCES articles(article_id),
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  personalized_title VARCHAR(500) NOT NULL,
  personalized_body TEXT NOT NULL,
  personalized_summary TEXT NOT NULL,
  tone VARCHAR(50),
  perspective VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(article_id, profile_id)
);

CREATE INDEX idx_personalized_article ON personalized_articles(article_id);
CREATE INDEX idx_personalized_profile ON personalized_articles(profile_id);

-- 읽기 기록 (성향 분석 및 추천용)
CREATE TABLE IF NOT EXISTS reading_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  article_id BIGINT NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_duration_sec INTEGER,
  reaction VARCHAR(20)
  -- liked, disliked, bookmarked, shared
);

CREATE INDEX idx_reading_user ON reading_history(user_id, read_at DESC);

-- 키워드 알림 설정
CREATE TABLE IF NOT EXISTS alert_keywords (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  keyword VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alert_user ON alert_keywords(user_id);
