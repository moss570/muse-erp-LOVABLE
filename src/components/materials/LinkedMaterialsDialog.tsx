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
import { useToast } from '@/hooks/use-toast';
import { Package, Search, Link, Unlink } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type ListedMaterialName = Tables<'listed_material_names'>;

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
        .select('id, code, name, category, is_active, manufacturer, item_number')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch existing links for this listed material
  const { data: existingLinks } = useQuery({
    queryKey: ['material-listed-links', listedMaterial?.id],
    queryFn: async () => {
      if (!listedMaterial?.id) return [];
      const { data, error } = await supabase
        .from('material_listed_material_links')
        .select('material_id')
        .eq('listed_material_id', listedMaterial.id);
      if (error) throw error;
      return data.map(l => l.material_id);
    },
    enabled: open && !!listedMaterial?.id,
  });

  const linkedMaterialIds = new Set(existingLinks || []);

  // Materials linked to this listed material
  const linkedMaterials = allMaterials?.filter(
    m => linkedMaterialIds.has(m.id)
  ) || [];

  // All active materials available for linking (can be linked to multiple listed materials)
  const availableMaterials = allMaterials?.filter(
    m => !linkedMaterialIds.has(m.id)
  ) || [];

  // Filter based on search - includes name, code, and manufacturer
  const searchLower = search.toLowerCase();
  const filteredLinked = linkedMaterials.filter(
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
      toast({ title: 'Material unlinked' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error unlinking material', description: error.message, variant: 'destructive' });
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
            Manage materials linked to "{listedMaterial?.name}". Materials can be linked to multiple listed materials.
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
            <ScrollArea className="h-40 rounded-md border">
              {filteredLinked.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No materials linked yet
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredLinked.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                    >
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
                        {(material.manufacturer || material.item_number) && (
                          <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
                            {material.manufacturer && (
                              <span>Mfr: {material.manufacturer}</span>
                            )}
                            {material.item_number && (
                              <span>• Item #: {material.item_number}</span>
                            )}
                          </div>
                        )}
                      </div>
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
                  ))}
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
                        {(material.manufacturer || material.item_number) && (
                          <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
                            {material.manufacturer && (
                              <span>Mfr: {material.manufacturer}</span>
                            )}
                            {material.item_number && (
                              <span>• Item #: {material.item_number}</span>
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
