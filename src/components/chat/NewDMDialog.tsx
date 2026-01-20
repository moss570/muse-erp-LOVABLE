import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateDM } from '@/hooks/useChat';
import EmployeeCombobox from '@/components/shared/EmployeeCombobox';

interface NewDMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewDMDialog = ({ open, onOpenChange }: NewDMDialogProps) => {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const createDM = useCreateDM();
  
  const handleCreate = async () => {
    if (!selectedUser) return;
    
    const channel = await createDM.mutateAsync(selectedUser);
    onOpenChange(false);
    navigate(`/chat?channel=${channel.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <EmployeeCombobox
            value={selectedUser}
            onChange={(v) => setSelectedUser(v || '')}
            placeholder="Search for a person..."
          />
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!selectedUser || createDM.isPending}>
              Start Conversation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewDMDialog;
