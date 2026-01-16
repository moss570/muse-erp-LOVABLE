import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Package, Search, Link, Unlink, Star, StarOff } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type ListedMaterialName = Tables<'listed_material_names'>;

interface MaterialLink {
  material_id: string;
  is_primary: boolean;
}

interface LinkedMaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listedMaterial: ListedMaterialName | null;
}

export function LinkedMaterialsDialog({ 
  open, 
  onOpenChange, 
  listedMaterial 
}: LinkedMaterialsDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all materials with manufacturer info
  const { data: allMaterials } = useQuery({
    queryKey: ['materials-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('id, code, name, category, is_active, manufacturer, item_number, label_copy')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch existing links for this listed material (including is_primary)
  const { data: existingLinks } = useQuery({
    queryKey: ['material-listed-links', listedMaterial?.id],
    queryFn: async () => {
      if (!listedMaterial?.id) return [];
      const { data, error } = await supabase
        .from('material_listed_material_links')
        .select('material_id, is_primary')
        .eq('listed_material_id', listedMaterial.id);
      if (error) throw error;
      return data as MaterialLink[];
    },
    enabled: open && !!listedMaterial?.id,
  });

  // Create a map for quick lookup
  const linkMap = new Map<string, MaterialLink>();
  existingLinks?.forEach(link => {
    linkMap.set(link.material_id, link);
  });

  const linkedMaterialIds = new Set(existingLinks?.map(l => l.material_id) || []);

  // Materials linked to this listed material
  const linkedMaterials = allMaterials?.filter(
    m => linkedMaterialIds.has(m.id)
  ) || [];

  // Sort linked materials: primary first
  const sortedLinkedMaterials = [...linkedMaterials].sort((a, b) => {
    const aIsPrimary = linkMap.get(a.id)?.is_primary || false;
    const bIsPrimary = linkMap.get(b.id)?.is_primary || false;
    if (aIsPrimary && !bIsPrimary) return -1;
    if (!aIsPrimary && bIsPrimary) return 1;
    return a.name.localeCompare(b.name);
  });

  // All active materials available for linking (can be linked to multiple listed materials)
  const availableMaterials = allMaterials?.filter(
    m => !linkedMaterialIds.has(m.id)
  ) || [];

  // Filter based on search - includes name, code, and manufacturer
  const searchLower = search.toLowerCase();
  const filteredLinked = sortedLinkedMaterials.filter(
    m => m.name.toLowerCase().includes(searchLower) ||
         m.code.toLowerCase().includes(searchLower) ||
         (m.manufacturer && m.manufacturer.toLowerCase().includes(searchLower))
  );

  const filteredAvailable = availableMaterials.filter(
    m => m.name.toLowerCase().includes(searchLower) ||
         m.code.toLowerCase().includes(searchLower) ||
         (m.manufacturer && m.manufacturer.toLowerCase().includes(searchLower))
  );

  const linkMutation = useMutation({
    mutationFn: async (materialIds: string[]) => {
      if (!listedMaterial?.id) throw new Error('No listed material selected');
      
      // Insert links into junction table
      const linksToInsert = materialIds.map(materialId => ({
        material_id: materialId,
        listed_material_id: listedMaterial.id,
      }));
      
      const { error } = await supabase
        .from('material_listed_material_links')
        .insert(linksToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['materials-for-linking'] });
      queryClient.invalidateQueries({ queryKey: ['material-listed-links'] });
      queryClient.invalidateQueries({ queryKey: ['listed-material-names'] });
      queryClient.invalidateQueries({ queryKey: ['listed-material-counts'] });
      toast({ title: 'Materials linked successfully' });
      setSelectedMaterials(new Set());
    },
    onError: (error: Error) => {
      toast({ title: 'Error linking materials', description: error.message, variant: 'destructive' });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (materialId: string) => {
      if (!listedMaterial?.id) throw new Error('No listed material selected');
      
      const { error } = await supabase
        .from('material_listed_material_links')
        .delete()
        .eq('material_id', materialId)
        .eq('listed_material_id', listedMaterial.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['materials-for-linking'] });
      queryClient.invalidateQueries({ queryKey: ['material-listed-links'] });
      queryClient.invalidateQueries({ queryKey: ['listed-material-names'] });
      queryClient.invalidateQueries({ queryKey: ['listed-material-counts'] });
      toast({ title: 'Material unlinked' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error unlinking material', description: error.message, variant: 'destructive' });
    },
  });

  // Set primary material mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (materialId: string) => {
      if (!listedMaterial?.id) throw new Error('No listed material selected');
      
      // The database trigger will handle unsetting other primaries
      const { error } = await supabase
        .from('material_listed_material_links')
        .update({ is_primary: true })
        .eq('material_id', materialId)
        .eq('listed_material_id', listedMaterial.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-listed-links'] });
      toast({ title: 'Primary material updated', description: 'This material\'s Label Copy will be used in ingredient statements.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error setting primary material', description: error.message, variant: 'destructive' });
    },
  });

  const handleToggleSelection = (materialId: string) => {
    const newSet = new Set(selectedMaterials);
    if (newSet.has(materialId)) {
      newSet.delete(materialId);
    } else {
      newSet.add(materialId);
    }
    setSelectedMaterials(newSet);
  };

  const handleLinkSelected = () => {
    if (selectedMaterials.size > 0) {
      linkMutation.mutate(Array.from(selectedMaterials));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Linked Materials
          </DialogTitle>
          <DialogDescription>
            Manage materials linked to "{listedMaterial?.name}". The <Star className="h-3 w-3 inline text-amber-500 fill-amber-500" /> PRIMARY material's Label Copy is used for ingredient statements.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or manufacturer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid gap-4">
          {/* Currently Linked Materials */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Badge variant="secondary">{linkedMaterials.length}</Badge>
              Currently Linked
            </h4>
            <ScrollArea className="h-48 rounded-md border">
              {filteredLinked.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No materials linked yet
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredLinked.map((material) => {
                    const isPrimary = linkMap.get(material.id)?.is_primary || false;
                    return (
                      <div
                        key={material.id}
                        className={`flex items-center justify-between p-2 rounded-md hover:bg-muted/50 ${isPrimary ? 'bg-amber-50 border border-amber-200' : ''}`}
                      >
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isPrimary ? (
                              <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                            ) : (
                              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="font-mono text-sm">{material.code}</span>
                            <span className="text-sm truncate">{material.name}</span>
                            {isPrimary && (
                              <Badge variant="default" className="bg-amber-500 text-white text-xs shrink-0">
                                Primary
                              </Badge>
                            )}
                            {material.category && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {material.category}
                              </Badge>
                            )}
                          </div>
                          {(material.manufacturer || material.item_number || material.label_copy) && (
                            <div className="flex flex-col gap-0.5 pl-6 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                {material.manufacturer && (
                                  <span>Mfr: {material.manufacturer}</span>
                                )}
                                {material.item_number && (
                                  <span>• Item #: {material.item_number}</span>
                                )}
                              </div>
                              {material.label_copy && (
                                <span className="text-primary">Label: {material.label_copy}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={isPrimary ? "secondary" : "ghost"}
                                  size="sm"
                                  className={`h-7 ${isPrimary ? 'text-amber-600' : 'text-muted-foreground hover:text-amber-500'}`}
                                  onClick={() => setPrimaryMutation.mutate(material.id)}
                                  disabled={isPrimary || setPrimaryMutation.isPending}
                                >
                                  {isPrimary ? (
                                    <Star className="h-3 w-3 fill-current" />
                                  ) : (
                                    <StarOff className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isPrimary ? 'This is the primary material' : 'Set as primary for ingredient statements'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => unlinkMutation.mutate(material.id)}
                            disabled={unlinkMutation.isPending}
                          >
                            <Unlink className="h-3 w-3 mr-1" />
                            Unlink
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Available Materials to Link */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Badge variant="outline">{availableMaterials.length}</Badge>
              Available to Link
            </h4>
            <ScrollArea className="h-48 rounded-md border">
              {filteredAvailable.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {search ? 'No materials match your search' : 'All materials are already linked'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredAvailable.map((material) => (
                    <label
                      key={material.id}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedMaterials.has(material.id)}
                        onCheckedChange={() => handleToggleSelection(material.id)}
                        className="mt-0.5"
                      />
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-mono text-sm">{material.code}</span>
                          <span className="text-sm truncate">{material.name}</span>
                          {material.category && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {material.category}
                            </Badge>
                          )}
                        </div>
                        {(material.manufacturer || material.item_number || material.label_copy) && (
                          <div className="flex flex-col gap-0.5 pl-6 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {material.manufacturer && (
                                <span>Mfr: {material.manufacturer}</span>
                              )}
                              {material.item_number && (
                                <span>• Item #: {material.item_number}</span>
                              )}
                            </div>
                            {material.label_copy && (
                              <span className="text-primary">Label: {material.label_copy}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleLinkSelected}
            disabled={selectedMaterials.size === 0 || linkMutation.isPending}
          >
            <Link className="h-4 w-4 mr-2" />
            Link Selected ({selectedMaterials.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
