-- Add photo evidence requirement setting for production stages
INSERT INTO public.inventory_preferences (preference_key, preference_value, preference_type, description)
VALUES ('require_stage_photo_evidence', 'false', 'boolean', 'Require photo evidence when completing production stages on Shop Floor')
ON CONFLICT (preference_key) DO NOTHING;