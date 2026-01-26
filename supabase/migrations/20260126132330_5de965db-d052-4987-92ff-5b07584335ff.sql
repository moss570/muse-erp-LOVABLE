-- ================================================================
-- POLICY & SOP MANAGEMENT SYSTEM - PHASE 1: CORE TABLES
-- ================================================================

-- Policy Categories
CREATE TABLE public.policy_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT '📋',
    parent_id UUID REFERENCES public.policy_categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Policy Types
CREATE TABLE public.policy_types (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    code_prefix TEXT NOT NULL,
    number_format TEXT DEFAULT '{PREFIX}-{YEAR}-{SEQ:4}',
    next_sequence INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Policies (Main Table)
CREATE TABLE public.policies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    category_id UUID REFERENCES public.policy_categories(id),
    type_id UUID REFERENCES public.policy_types(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived', 'superseded')),
    version INTEGER DEFAULT 1,
    effective_date DATE,
    review_date DATE,
    expiry_date DATE,
    owner_id UUID REFERENCES public.profiles(id),
    reviewer_id UUID REFERENCES public.profiles(id),
    approver_id UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES public.profiles(id),
    department_id UUID REFERENCES public.departments(id),
    requires_acknowledgement BOOLEAN DEFAULT false,
    acknowledgement_frequency_days INTEGER,
    supersedes_id UUID REFERENCES public.policies(id),
    is_template BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Policy Versions
CREATE TABLE public.policy_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    change_notes TEXT,
    snapshot JSONB,
    status TEXT NOT NULL,
    effective_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),
    UNIQUE(policy_id, version_number)
);

-- Policy Attachments
CREATE TABLE public.policy_attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT,
    file_url TEXT,
    file_type TEXT,
    file_size INTEGER,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    uploaded_by UUID REFERENCES public.profiles(id)
);

-- Policy Tags
CREATE TABLE public.policy_tags (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Policy Tag Mappings
CREATE TABLE public.policy_tag_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.policy_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(policy_id, tag_id)
);

-- Policy Comments
CREATE TABLE public.policy_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.policy_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Policy Acknowledgements
CREATE TABLE public.policy_acknowledgements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    policy_version INTEGER NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    signature_data TEXT,
    ip_address TEXT,
    notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(policy_id, employee_id, policy_version)
);

-- Policy Related
CREATE TABLE public.policy_related (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    related_policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    relationship_type TEXT DEFAULT 'related' CHECK (relationship_type IN ('related', 'parent', 'child', 'supersedes', 'references')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),
    UNIQUE(policy_id, related_policy_id),
    CHECK (policy_id != related_policy_id)
);

-- Indexes
CREATE INDEX idx_policies_status ON public.policies(status);
CREATE INDEX idx_policies_category ON public.policies(category_id);
CREATE INDEX idx_policies_type ON public.policies(type_id);
CREATE INDEX idx_policy_versions_policy ON public.policy_versions(policy_id);
CREATE INDEX idx_policy_attachments_policy ON public.policy_attachments(policy_id);
CREATE INDEX idx_policy_acknowledgements_policy ON public.policy_acknowledgements(policy_id);

-- Enable RLS on all tables
ALTER TABLE public.policy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_tag_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_related ENABLE ROW LEVEL SECURITY;

-- RLS Policies using existing is_admin_or_manager function
CREATE POLICY "Authenticated can view policy_categories" ON public.policy_categories FOR SELECT USING (true);
CREATE POLICY "Managers can manage policy_categories" ON public.policy_categories FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view policy_types" ON public.policy_types FOR SELECT USING (true);
CREATE POLICY "Managers can manage policy_types" ON public.policy_types FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view policies" ON public.policies FOR SELECT USING (true);
CREATE POLICY "Managers can manage policies" ON public.policies FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view policy_versions" ON public.policy_versions FOR SELECT USING (true);
CREATE POLICY "Managers can manage policy_versions" ON public.policy_versions FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view policy_attachments" ON public.policy_attachments FOR SELECT USING (true);
CREATE POLICY "Managers can manage policy_attachments" ON public.policy_attachments FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view policy_tags" ON public.policy_tags FOR SELECT USING (true);
CREATE POLICY "Managers can manage policy_tags" ON public.policy_tags FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view policy_tag_mappings" ON public.policy_tag_mappings FOR SELECT USING (true);
CREATE POLICY "Managers can manage policy_tag_mappings" ON public.policy_tag_mappings FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view policy_comments" ON public.policy_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated can create policy_comments" ON public.policy_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own comments" ON public.policy_comments FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Managers can delete policy_comments" ON public.policy_comments FOR DELETE USING (created_by = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view policy_acknowledgements" ON public.policy_acknowledgements FOR SELECT USING (true);
CREATE POLICY "Authenticated can create policy_acknowledgements" ON public.policy_acknowledgements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can view policy_related" ON public.policy_related FOR SELECT USING (true);
CREATE POLICY "Managers can manage policy_related" ON public.policy_related FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_policy_categories_updated_at BEFORE UPDATE ON public.policy_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_policy_types_updated_at BEFORE UPDATE ON public.policy_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_policy_comments_updated_at BEFORE UPDATE ON public.policy_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();