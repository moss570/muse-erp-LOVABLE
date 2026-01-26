import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface SQFEdition {
  id: string;
  name: string;
  version: string;
  effective_date: string | null;
  edition_date: string | null;
  is_active: boolean;
  codes_extracted: number | null;
  parsing_status: string | null;
}

interface SQFEditionSettingsDialogProps {
  edition: SQFEdition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SQFEditionSettingsDialog({ edition, open, onOpenChange }: SQFEditionSettingsDialogProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: edition?.name || "",
    version: edition?.version || "",
    effective_date: edition?.effective_date || "",
    edition_date: edition?.edition_date || "",
    is_active: edition?.is_active || false,
  });

  // Update form when edition changes
  useState(() => {
    if (edition) {
      setFormData({
        name: edition.name,
        version: edition.version,
        effective_date: edition.effective_date || "",
        edition_date: edition.edition_date || "",
        is_active: edition.is_active,
      });
    }
  });

  const handleSave = async () => {
    if (!edition) return;
    
    setIsSaving(true);
    try {
      // If setting as active, deactivate other editions first
      if (formData.is_active && !edition.is_active) {
        await supabase
          .from("sqf_editions")
          .update({ is_active: false })
          .neq("id", edition.id);
      }

      const { error } = await supabase
        .from("sqf_editions")
        .update({
          name: formData.name,
          version: formData.version,
          effective_date: formData.effective_date || null,
          edition_date: formData.edition_date || null,
          is_active: formData.is_active,
        })
        .eq("id", edition.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["sqf-editions"] });
      await queryClient.invalidateQueries({ queryKey: ["sqf-codes"] });
      
      toast.success("Edition updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating edition:", error);
      toast.error("Failed to update edition");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!edition) return;
    
    setIsDeleting(true);
    try {
      // Delete associated codes first
      await supabase
        .from("sqf_codes")
        .delete()
        .eq("edition_id", edition.id);

      // Then delete the edition
      const { error } = await supabase
        .from("sqf_editions")
        .delete()
        .eq("id", edition.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["sqf-editions"] });
      await queryClient.invalidateQueries({ queryKey: ["sqf-codes"] });
      
      toast.success("Edition deleted successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting edition:", error);
      toast.error("Failed to delete edition");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!edition) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edition Settings</DialogTitle>
          <DialogDescription>
            Update edition details or manage its status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Edition Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edition_date">Edition Date</Label>
              <Input
                id="edition_date"
                type="date"
                value={formData.edition_date}
                onChange={(e) => setFormData({ ...formData, edition_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="effective_date">Effective Date</Label>
            <Input
              id="effective_date"
              type="date"
              value={formData.effective_date}
              onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <Label>Set as Active Edition</Label>
              <p className="text-sm text-muted-foreground">
                Use this edition for compliance tracking
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="pt-2 border-t">
            <div className="text-sm text-muted-foreground mb-2">
              <strong>Codes Extracted:</strong> {edition.codes_extracted || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Parsing Status:</strong> {edition.parsing_status || "pending"}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Edition?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the edition "{edition.name}" and all {edition.codes_extracted || 0} extracted codes. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
