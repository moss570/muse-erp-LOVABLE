import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateChannel } from '@/hooks/useChat';
import { Hash, Lock } from 'lucide-react';

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateChannelDialog = ({ open, onOpenChange }: CreateChannelDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channelType, setChannelType] = useState<'public' | 'private'>('public');
  
  const createChannel = useCreateChannel();
  
  const handleCreate = async () => {
    if (!name.trim()) return;
    
    await createChannel.mutateAsync({
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      description,
      channelType,
    });
    
    setName('');
    setDescription('');
    setChannelType('public');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Channel Type</Label>
            <RadioGroup value={channelType} onValueChange={(v: 'public' | 'private') => setChannelType(v)} className="mt-2">
              <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                  <Hash className="h-4 w-4" />
                  Public - Anyone can join
                </Label>
              </div>
              <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                  <Lock className="h-4 w-4" />
                  Private - Invite only
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., project-updates"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Names must be lowercase with hyphens
            </p>
          </div>
          
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              rows={2}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createChannel.isPending}>
              Create Channel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChannelDialog;
