-- Add manufacturing preference for tracking time by production
INSERT INTO inventory_preferences (preference_key, preference_value, preference_type, description)
VALUES ('track_time_by_production', 'false', 'boolean', 'Enable labor time tracking on Work Orders in Shop Floor')
ON CONFLICT (preference_key) DO NOTHING;