import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export type LabelType = 'receiving' | 'production' | 'shipping' | 'inventory' | 'custom';
export type LabelFormat = '3x2' | '3x5' | '4x6' | '2x1' | 'custom';
export type BarcodeType = 'CODE128' | 'QR' | 'EAN13' | 'UPC-A';

export interface LabelFieldConfig {
  field_key: string;
  label: string;
  position: { x: number; y: number };
  font_size: number;
  bold: boolean;
}

export interface LabelTemplate {
  id: string;
  name: string;
  label_type: string;
  label_format: string;
  width_inches: number;
  height_inches: number;
  description: string | null;
  template_html: string | null;
  barcode_type: string;
  include_barcode: boolean;
  barcode_field: string;
  fields_config: Json;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLabelTemplateInput {
  name: string;
  label_type: string;
  label_format: string;
  width_inches?: number;
  height_inches?: number;
  description?: string;
  template_html?: string;
  barcode_type?: string;
  include_barcode?: boolean;
  barcode_field?: string;
  is_default?: boolean;
}

export interface UpdateLabelTemplateInput extends Partial<CreateLabelTemplateInput> {
  id: string;
}

export function useLabelTemplates(labelType?: LabelType) {
  return useQuery({
    queryKey: ['label-templates', labelType],
    queryFn: async () => {
      let query = supabase
        .from('label_templates')
        .select('*')
        .order('sort_order', { ascending: true });

      if (labelType) {
        query = query.eq('label_type', labelType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LabelTemplate[];
    },
  });
}

export function useCreateLabelTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLabelTemplateInput) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('label_templates')
        .insert({
          name: input.name,
          label_type: input.label_type,
          label_format: input.label_format,
          width_inches: input.width_inches,
          height_inches: input.height_inches,
          description: input.description,
          barcode_type: input.barcode_type,
          include_barcode: input.include_barcode,
          barcode_field: input.barcode_field,
          is_default: input.is_default,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LabelTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-templates'] });
      toast.success('Label template created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create label template: ${error.message}`);
    },
  });
}

export function useUpdateLabelTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateLabelTemplateInput) => {
      const { data, error } = await supabase
        .from('label_templates')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as LabelTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-templates'] });
      toast.success('Label template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update label template: ${error.message}`);
    },
  });
}

export function useDeleteLabelTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('label_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-templates'] });
      toast.success('Label template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete label template: ${error.message}`);
    },
  });
}

export const LABEL_FORMAT_PRESETS: Record<LabelFormat, { width: number; height: number; label: string }> = {
  '3x2': { width: 3, height: 2, label: '3" × 2" (Receiving)' },
  '3x5': { width: 3, height: 5, label: '3" × 5" (Production)' },
  '4x6': { width: 4, height: 6, label: '4" × 6" (Shipping)' },
  '2x1': { width: 2, height: 1, label: '2" × 1" (Small Tag)' },
  'custom': { width: 3, height: 2, label: 'Custom Size' },
};

export const LABEL_TYPES: { value: LabelType; label: string }[] = [
  { value: 'receiving', label: 'Receiving' },
  { value: 'production', label: 'Production' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'custom', label: 'Custom' },
];

export const BARCODE_TYPES: { value: BarcodeType; label: string }[] = [
  { value: 'CODE128', label: 'Code 128' },
  { value: 'QR', label: 'QR Code' },
  { value: 'EAN13', label: 'EAN-13' },
  { value: 'UPC-A', label: 'UPC-A' },
];
