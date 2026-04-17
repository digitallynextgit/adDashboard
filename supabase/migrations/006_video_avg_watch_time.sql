-- Phase 6: Add average video watch time to campaign metrics and ad creatives
-- Run this in Supabase SQL Editor

ALTER TABLE campaign_metrics
ADD COLUMN IF NOT EXISTS video_avg_watch_time DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE ad_creatives
ADD COLUMN IF NOT EXISTS video_avg_watch_time DECIMAL(10,2) NOT NULL DEFAULT 0;
