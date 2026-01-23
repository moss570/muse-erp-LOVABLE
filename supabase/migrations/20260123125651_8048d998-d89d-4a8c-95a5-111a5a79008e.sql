-- Add auto-rollover setting for production targets
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS auto_rollover_production_targets boolean NOT NULL DEFAULT false;