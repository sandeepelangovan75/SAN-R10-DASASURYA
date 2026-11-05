-- ============================================================================
-- DASASURYA AI ADAPTIVE LEARNING SYSTEM — SUPABASE SCHEMA & SECURITY POLICIES
-- ============================================================================
-- Execute this script in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 2. TABLE: public.profiles
-- Stores user personal profile, goals, demographic safeguards, and preferences
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  date_of_birth DATE,
  age INTEGER,
  is_under_12 BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'learner' CHECK (role IN ('core_admin', 'admin', 'curator_admin', 'learner')),
  interests TEXT[] DEFAULT ARRAY['Knowledge', 'Wellness', 'Strategy']::TEXT[],
  preferred_heads TEXT[] DEFAULT ARRAY['head-01-knowledge']::TEXT[],
  learning_goals TEXT DEFAULT '',
  skill_level TEXT DEFAULT 'Foundational',
  preferred_schedule TEXT DEFAULT '30 mins/day',
  language_preferences JSONB DEFAULT '{"interfaceLanguage":"en","responseLanguage":"en","learningLanguage":"en"}'::JSONB,
  parental_consent JSONB DEFAULT '{"required":false,"authorized":true}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public can view usernames and display names for community/mentoring" ON public.profiles;
CREATE POLICY "Public can view usernames and display names for community/mentoring"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 3. TABLE: public.learning_progress
-- Tracks reading percentages, socratic quiz scores, reflections, and streaks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  chapter_progress JSONB DEFAULT '{}'::JSONB NOT NULL,
  last_active_chapter_id TEXT DEFAULT 'chap-01-first-principles',
  last_active_head_id TEXT DEFAULT 'head-01-knowledge',
  streak_days INTEGER DEFAULT 1 NOT NULL,
  last_active_date DATE DEFAULT CURRENT_DATE NOT NULL,
  total_reading_minutes INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on learning_progress
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own learning progress" ON public.learning_progress;
CREATE POLICY "Users can view their own learning progress"
  ON public.learning_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own learning progress" ON public.learning_progress;
CREATE POLICY "Users can insert their own learning progress"
  ON public.learning_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own learning progress" ON public.learning_progress;
CREATE POLICY "Users can update their own learning progress"
  ON public.learning_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. TABLE: public.learning_roadmaps
-- Stores personalized multi-stage learning roadmaps generated with DASASURYA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_roadmaps (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal TEXT NOT NULL,
  target_language TEXT DEFAULT 'en' NOT NULL,
  explanation_level TEXT DEFAULT 'intermediate' NOT NULL,
  current_knowledge TEXT DEFAULT '',
  available_minutes_per_day INTEGER DEFAULT 30,
  target_deadline_weeks INTEGER DEFAULT 4,
  is_age_appropriate BOOLEAN DEFAULT TRUE,
  stages JSONB DEFAULT '[]'::JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on learning_roadmaps
ALTER TABLE public.learning_roadmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roadmaps" ON public.learning_roadmaps;
CREATE POLICY "Users can view their own roadmaps"
  ON public.learning_roadmaps FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own roadmaps" ON public.learning_roadmaps;
CREATE POLICY "Users can insert their own roadmaps"
  ON public.learning_roadmaps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own roadmaps" ON public.learning_roadmaps;
CREATE POLICY "Users can update their own roadmaps"
  ON public.learning_roadmaps FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own roadmaps" ON public.learning_roadmaps;
CREATE POLICY "Users can delete their own roadmaps"
  ON public.learning_roadmaps FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. TABLE: public.user_preferences
-- Dedicated preferences store for independent language and interface controls
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  interface_language TEXT DEFAULT 'en' NOT NULL,
  response_language TEXT DEFAULT 'en' NOT NULL,
  learning_language TEXT DEFAULT 'en' NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert or update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert or update their own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. TABLE: public.activity_history
-- Records verified credits and daily learning activities
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_history (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER DEFAULT 0 NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on activity_history
ALTER TABLE public.activity_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own activity history" ON public.activity_history;
CREATE POLICY "Users can view their own activity history"
  ON public.activity_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own activity records" ON public.activity_history;
CREATE POLICY "Users can insert their own activity records"
  ON public.activity_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- Automatically provisions a profile row when a new user signs up in auth.users
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_username TEXT;
  v_dob DATE;
  v_phone TEXT;
BEGIN
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');
  v_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  v_phone := COALESCE(new.raw_user_meta_data->>'phone', new.phone);
  
  BEGIN
    v_dob := (new.raw_user_meta_data->>'date_of_birth')::DATE;
  EXCEPTION WHEN OTHERS THEN
    v_dob := NULL;
  END;

  INSERT INTO public.profiles (
    id,
    full_name,
    username,
    email,
    phone,
    date_of_birth,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    v_full_name,
    v_username,
    new.email,
    v_phone,
    v_dob,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- VERIFICATION QUERY
-- Run this to check if all tables and policies exist:
-- ============================================================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
