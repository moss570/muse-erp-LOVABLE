-- =============================================
-- POLICY & SOP MANAGEMENT SYSTEM - CORE TABLES
-- Complete document management with versioning, approval, and organization
-- =============================================

-- =============================================
-- 1. DOCUMENT ORGANIZATION
-- =============================================

-- Policy Categories (Food Safety, Quality, GMP, etc.)
CREATE TABLE IF NOT EXISTS public.policy_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES public.policy_categories(id) ON DELETE SET NULL,

  -- Visual customization
  icon VARCHAR(50),  -- Lucide icon name
  color VARCHAR(7),  -- Hex color code

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Policy Types (SOP, Policy, Work Instruction, HACCP, Form, etc.)
CREATE TABLE IF NOT EXISTS public.policy_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  abbreviation VARCHAR(20),  -- For policy numbering (SOP, POL, WI, HACCP)
  description TEXT,

  -- Default settings
  requires_acknowledgement BOOLEAN DEFAULT false,
  default_review_frequency_months INTEGER DEFAULT 12,

  -- Visual customization
  icon VARCHAR(50),

  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Policy Tags (flexible tagging system)
CREATE TABLE IF NOT EXISTS public.policy_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(7),  -- Hex color
  created_at TIMESTAMP DEFAULT now()
);

-- =============================================
-- 2. MAIN POLICIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  policy_number VARCHAR(100) UNIQUE NOT NULL,  -- Auto-generated: SOP-2024-FS-001
  title VARCHAR(500) NOT NULL,

  -- Classification
  category_id UUID REFERENCES public.policy_categories(id),
  policy_type_id UUID REFERENCES public.policy_types(id),
  department VARCHAR(100),

  -- Version Control
  version_number INTEGER DEFAULT 1,
  version_status VARCHAR(50) DEFAULT 'current' CHECK (version_status IN ('draft', 'current', 'archived', 'superseded')),

  -- Status Workflow
  status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Under_Review', 'Pending_Approval', 'Approved', 'Archived')),

  -- Dates
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  approved_at TIMESTAMP,
  effective_date DATE,
  review_date DATE,  -- Next scheduled review
  review_frequency_months INTEGER DEFAULT 12,
  last_reviewed_at DATE,
  expires_at DATE,

  -- Content
  content_type VARCHAR(50) DEFAULT 'native',  -- native, word, excel, pdf
  content_json JSONB,  -- Tiptap editor content
  content_html TEXT,  -- Rendered HTML for quick display
  content_summary TEXT,  -- AI-generated or manual summary

  -- Original uploads
  original_file_url VARCHAR(500),
  original_file_name VARCHAR(255),
  original_file_path VARCHAR(500),

  -- Ownership & Responsibility
  created_by UUID REFERENCES public.profiles(id),
  owned_by UUID REFERENCES public.profiles(id),  -- Responsible manager
  approved_by UUID REFERENCES public.profiles(id),

  -- Settings
  require_acknowledgement BOOLEAN DEFAULT false,
  acknowledgement_frequency_months INTEGER,  -- For periodic re-acknowledgement
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,

  -- Search & Discovery
  keywords TEXT[],  -- Array of keywords for search
  related_policy_ids UUID[],  -- Cross-references

  -- Metadata
  notes TEXT,

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content_summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(keywords, ' '), '')), 'C')
  ) STORED
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_policies_category ON public.policies(category_id);
CREATE INDEX IF NOT EXISTS idx_policies_type ON public.policies(policy_type_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON public.policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_owner ON public.policies(owned_by);
CREATE INDEX IF NOT EXISTS idx_policies_search ON public.policies USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_policies_number ON public.policies(policy_number);
CREATE INDEX IF NOT EXISTS idx_policies_active ON public.policies(is_active) WHERE is_active = true;

-- Policy Tag Assignments (many-to-many)
CREATE TABLE IF NOT EXISTS public.policy_tag_assignments (
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.policy_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (policy_id, tag_id)
);

-- =============================================
-- 3. VERSION CONTROL
-- =============================================

-- Policy Versions (complete snapshots of policy at each version)
CREATE TABLE IF NOT EXISTS public.policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  -- Snapshot of policy at this version
  snapshot JSONB NOT NULL,  -- Complete policy record
  content_snapshot JSONB,  -- Content at this version

  -- Change tracking
  changes_summary TEXT,  -- What changed
  change_type VARCHAR(50),  -- major, minor, typo_fix
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMP DEFAULT now(),

  -- Approval tracking
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP,

  -- Archival
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP,
  replaced_by_version INTEGER,

  UNIQUE(policy_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_policy_versions_policy ON public.policy_versions(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_versions_version ON public.policy_versions(version_number);

-- =============================================
-- 4. REVIEW & VALIDATION TRACKING
-- =============================================

-- Policy Reviews (scheduled and ad-hoc reviews)
CREATE TABLE IF NOT EXISTS public.policy_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,

  review_date DATE NOT NULL,
  reviewed_by UUID REFERENCES public.profiles(id),
  review_type VARCHAR(50) CHECK (review_type IN ('Scheduled', 'Ad_Hoc', 'Audit_Triggered', 'Regulatory_Update', 'Incident_Triggered')),

  -- Review findings
  outcome VARCHAR(50) CHECK (outcome IN ('No_Change', 'Minor_Update', 'Major_Revision', 'Obsolete')),
  findings TEXT,
  actions_required TEXT,

  -- Follow-up
  completed_at TIMESTAMP,
  next_review_date DATE,

  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_review_outcome CHECK (outcome IN ('No_Change', 'Minor_Update', 'Major_Revision', 'Obsolete'))
);

CREATE INDEX IF NOT EXISTS idx_policy_reviews_policy ON public.policy_reviews(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_reviews_date ON public.policy_reviews(review_date);

-- =============================================
-- 5. EMPLOYEE ACKNOWLEDGEMENTS
-- =============================================

-- Policy Acknowledgements (track who has read/acknowledged policies)
CREATE TABLE IF NOT EXISTS public.policy_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  policy_version_number INTEGER NOT NULL,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Acknowledgement details
  acknowledged_at TIMESTAMP DEFAULT now(),
  acknowledgement_method VARCHAR(50) CHECK (acknowledgement_method IN ('Electronic_Signature', 'Training_Session', 'Quiz_Passed', 'Digital_Accept')),

  -- Quiz/Assessment
  quiz_taken BOOLEAN DEFAULT false,
  quiz_score DECIMAL(5,2),  -- Percentage
  quiz_attempts INTEGER DEFAULT 0,

  -- Expiration (for periodic re-acknowledgement)
  expires_at TIMESTAMP,
  is_current BOOLEAN DEFAULT true,

  -- Digital signature
  signature_data TEXT,  -- Base64 signature image
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Notes
  notes TEXT,

  created_at TIMESTAMP DEFAULT now(),

  UNIQUE(policy_id, policy_version_number, employee_id, acknowledged_at)
);

CREATE INDEX IF NOT EXISTS idx_policy_acks_policy ON public.policy_acknowledgements(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_acks_employee ON public.policy_acknowledgements(employee_id);
CREATE INDEX IF NOT EXISTS idx_policy_acks_current ON public.policy_acknowledgements(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_policy_acks_expires ON public.policy_acknowledgements(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================
-- 6. POLICY ATTACHMENTS
-- =============================================

-- Policy Attachments (forms, images, videos, related documents)
CREATE TABLE IF NOT EXISTS public.policy_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,

  -- File info
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),  -- MIME type
  file_url VARCHAR(500) NOT NULL,
  file_path VARCHAR(500),
  file_size_bytes BIGINT,

  -- Classification
  attachment_type VARCHAR(50),  -- form, checklist, image, video, reference_doc
  description TEXT,

  -- Display
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,

  -- Metadata
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMP DEFAULT now(),

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_attachments_policy ON public.policy_attachments(policy_id);

-- =============================================
-- 7. POLICY COMMENTS & COLLABORATION
-- =============================================

-- Policy Comments (for review and collaboration)
CREATE TABLE IF NOT EXISTS public.policy_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,

  -- Comment details
  comment_text TEXT NOT NULL,
  comment_type VARCHAR(50) DEFAULT 'general' CHECK (comment_type IN ('general', 'review_feedback', 'question', 'suggestion', 'approval')),

  -- Thread support
  parent_comment_id UUID REFERENCES public.policy_comments(id) ON DELETE CASCADE,

  -- Section reference (for inline comments)
  section_reference VARCHAR(255),  -- Tiptap node ID or section number

  -- Status
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMP,

  -- User
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_comments_policy ON public.policy_comments(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_comments_parent ON public.policy_comments(parent_comment_id);

-- =============================================
-- 8. IMPORT/EXPORT LOG
-- =============================================

-- Policy Import/Export Log (track Word/Excel round-trip editing)
CREATE TABLE IF NOT EXISTS public.policy_import_export_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('export_word', 'export_pdf', 'export_markdown', 'import_word', 'import_excel')),

  -- Export details
  exported_version_number INTEGER,
  export_format VARCHAR(50),

  -- Import details
  imported_from_version_number INTEGER,
  created_new_version_number INTEGER,
  metadata_valid BOOLEAN,
  changes_detected JSONB,  -- {additions, deletions, modifications}

  -- User tracking
  user_id UUID REFERENCES public.profiles(id),
  timestamp TIMESTAMP DEFAULT now(),

  -- File references
  original_file_path VARCHAR(500),
  imported_file_path VARCHAR(500),

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_export_policy ON public.policy_import_export_log(policy_id);
CREATE INDEX IF NOT EXISTS idx_import_export_action ON public.policy_import_export_log(action_type);

-- =============================================
-- 9. RLS POLICIES
-- =============================================

-- Enable Row Level Security
ALTER TABLE public.policy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_import_export_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin/manager
CREATE OR REPLACE FUNCTION public.is_policy_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager', 'supervisor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies: Everyone can view published, managers can edit
CREATE POLICY "Anyone can view published policies"
  ON public.policies FOR SELECT
  USING (is_published = true OR is_policy_admin_or_manager());

CREATE POLICY "Managers can insert policies"
  ON public.policies FOR INSERT
  WITH CHECK (is_policy_admin_or_manager());

CREATE POLICY "Managers can update policies"
  ON public.policies FOR UPDATE
  USING (is_policy_admin_or_manager());

CREATE POLICY "Admins can delete policies"
  ON public.policies FOR DELETE
  USING (is_policy_admin_or_manager());

-- Categories, Types, Tags: Visible to all, manageable by admins
CREATE POLICY "Anyone can view categories"
  ON public.policy_categories FOR SELECT
  USING (true);

CREATE POLICY "Managers can manage categories"
  ON public.policy_categories FOR ALL
  USING (is_policy_admin_or_manager());

CREATE POLICY "Anyone can view types"
  ON public.policy_types FOR SELECT
  USING (true);

CREATE POLICY "Managers can manage types"
  ON public.policy_types FOR ALL
  USING (is_policy_admin_or_manager());

CREATE POLICY "Anyone can view tags"
  ON public.policy_tags FOR SELECT
  USING (true);

CREATE POLICY "Managers can manage tags"
  ON public.policy_tags FOR ALL
  USING (is_policy_admin_or_manager());

-- Acknowledgements: Users can view their own, managers can view all
CREATE POLICY "Users can view own acknowledgements"
  ON public.policy_acknowledgements FOR SELECT
  USING (employee_id = auth.uid() OR is_policy_admin_or_manager());

CREATE POLICY "Users can create own acknowledgements"
  ON public.policy_acknowledgements FOR INSERT
  WITH CHECK (employee_id = auth.uid());

-- Comments: Users can view and comment on policies they have access to
CREATE POLICY "Users can view comments on accessible policies"
  ON public.policy_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.policies p
      WHERE p.id = policy_id AND (p.is_published = true OR is_policy_admin_or_manager())
    )
  );

CREATE POLICY "Users can create comments"
  ON public.policy_comments FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own comments"
  ON public.policy_comments FOR UPDATE
  USING (created_by = auth.uid());

-- Allow managers to view all other tables
CREATE POLICY "Managers can view versions"
  ON public.policy_versions FOR SELECT
  USING (is_policy_admin_or_manager());

CREATE POLICY "Managers can view reviews"
  ON public.policy_reviews FOR SELECT
  USING (is_policy_admin_or_manager());

CREATE POLICY "Managers can view attachments"
  ON public.policy_attachments FOR SELECT
  USING (is_policy_admin_or_manager());

CREATE POLICY "Managers can view import/export logs"
  ON public.policy_import_export_log FOR SELECT
  USING (is_policy_admin_or_manager());

-- =============================================
-- 10. SEED DATA - DEFAULT CATEGORIES & TYPES
-- =============================================

-- Insert default categories
INSERT INTO public.policy_categories (name, description, icon, color, sort_order) VALUES
('Food Safety', 'Food safety policies and procedures', 'shield-check', '#16a34a', 1),
('Quality Assurance', 'Quality control and assurance policies', 'badge-check', '#2563eb', 2),
('Good Manufacturing Practices', 'GMP policies and procedures', 'factory', '#dc2626', 3),
('HACCP', 'HACCP plans and critical control points', 'alert-triangle', '#ea580c', 4),
('Allergen Management', 'Allergen control policies', 'alert-circle', '#9333ea', 5),
('Sanitation', 'Cleaning and sanitation procedures', 'sparkles', '#0891b2', 6),
('Traceability', 'Product traceability and recall procedures', 'route', '#65a30d', 7),
('Employee Training', 'Training policies and SOPs', 'graduation-cap', '#7c3aed', 8),
('Human Resources', 'HR policies and procedures', 'users', '#db2777', 9),
('Environmental', 'Environmental monitoring and control', 'leaf', '#059669', 10),
('Maintenance', 'Equipment maintenance procedures', 'wrench', '#4b5563', 11),
('Security', 'Facility security and access control', 'lock', '#1f2937', 12),
('Forms & Templates', 'Standard forms and templates', 'file-text', '#6366f1', 13)
ON CONFLICT (name) DO NOTHING;

-- Insert default policy types
INSERT INTO public.policy_types (name, abbreviation, description, requires_acknowledgement, default_review_frequency_months, icon) VALUES
('Standard Operating Procedure', 'SOP', 'Step-by-step instructions for routine operations', true, 12, 'file-text'),
('Company Policy', 'POL', 'High-level policies and guidelines', true, 12, 'book-open'),
('Work Instruction', 'WI', 'Detailed task-specific instructions', false, 6, 'list-checks'),
('Form', 'FORM', 'Standard forms and checklists', false, 12, 'file-spreadsheet'),
('HACCP Plan', 'HACCP', 'HACCP critical control point documentation', true, 6, 'shield-alert'),
('Food Safety Plan', 'FSP', 'Comprehensive food safety plans', true, 12, 'shield-check'),
('Emergency Procedure', 'EMERG', 'Emergency response procedures', true, 6, 'siren')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 11. HELPER VIEWS
-- =============================================

-- View: Active policies with full details
CREATE OR REPLACE VIEW public.active_policies_view AS
SELECT
  p.*,
  pc.name as category_name,
  pc.color as category_color,
  pc.icon as category_icon,
  pt.name as policy_type_name,
  pt.abbreviation as policy_type_abbrev,
  creator.first_name || ' ' || creator.last_name as created_by_name,
  owner.first_name || ' ' || owner.last_name as owned_by_name,
  approver.first_name || ' ' || owner.last_name as approved_by_name,
  (SELECT COUNT(*) FROM public.policy_acknowledgements pa WHERE pa.policy_id = p.id AND pa.is_current = true) as acknowledgement_count,
  (SELECT COUNT(*) FROM public.policy_comments pc WHERE pc.policy_id = p.id AND pc.is_resolved = false) as open_comments_count
FROM public.policies p
LEFT JOIN public.policy_categories pc ON p.category_id = pc.id
LEFT JOIN public.policy_types pt ON p.policy_type_id = pt.id
LEFT JOIN public.profiles creator ON p.created_by = creator.id
LEFT JOIN public.profiles owner ON p.owned_by = owner.id
LEFT JOIN public.profiles approver ON p.approved_by = approver.id
WHERE p.is_active = true;

-- View: Policies requiring review
CREATE OR REPLACE VIEW public.policies_requiring_review AS
SELECT
  p.*,
  pc.name as category_name,
  pt.name as policy_type_name,
  owner.first_name || ' ' || owner.last_name as owned_by_name,
  CASE
    WHEN p.review_date < CURRENT_DATE THEN 'Overdue'
    WHEN p.review_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Due_Soon'
    ELSE 'Upcoming'
  END as review_status
FROM public.policies p
LEFT JOIN public.policy_categories pc ON p.category_id = pc.id
LEFT JOIN public.policy_types pt ON p.policy_type_id = pt.id
LEFT JOIN public.profiles owner ON p.owned_by = owner.id
WHERE p.is_active = true
  AND p.review_date IS NOT NULL
  AND p.status = 'Approved';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
