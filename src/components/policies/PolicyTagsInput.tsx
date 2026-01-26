import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Tag } from 'lucide-react';
import { usePolicyTags, useCreatePolicyTag } from '@/hooks/usePolicyTags';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PolicyTagsInputProps {
  selectedTags: string[];
  onChange: (tagIds: string[]) => void;
  className?: string;
}

export function PolicyTagsInput({ selectedTags, onChange, className }: PolicyTagsInputProps) {
  const { data: allTags, isLoading } = usePolicyTags();
  const createTag = useCreatePolicyTag();
  const [newTagName, setNewTagName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleToggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(id => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name cannot be empty');
      return;
    }

    // Check if tag already exists
    const existing = allTags?.find(
      tag => tag.tag_name.toLowerCase() === newTagName.trim().toLowerCase()
    );

    if (existing) {
      toast.error('A tag with this name already exists');
      return;
    }

    try {
      const newTag = await createTag.mutateAsync({
        tag_name: newTagName.trim(),
        description: '',
      });

      // Automatically select the newly created tag
      onChange([...selectedTags, newTag.id]);
      setNewTagName('');
      setShowCreateForm(false);
      toast.success('Tag created successfully');
    } catch (error) {
      toast.error('Failed to create tag');
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTags.filter(id => id !== tagId));
  };

  const selectedTagObjects = allTags?.filter(tag => selectedTags.includes(tag.id)) || [];
  const availableTags = allTags?.filter(tag => !selectedTags.includes(tag.id)) || [];

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <p className="text-sm text-muted-foreground">Loading tags...</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Selected Tags */}
      <div className="space-y-3">
        <Label>Selected Tags ({selectedTags.length})</Label>
        {selectedTagObjects.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedTagObjects.map(tag => (
              <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
                <Tag className="h-3 w-3" />
                {tag.tag_name}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleRemoveTag(tag.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                No tags selected. Select tags from the list below or create a new one.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create New Tag */}
      <div className="space-y-3">
        {!showCreateForm ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateForm(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Tag
          </Button>
        ) : (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-tag">New Tag Name</Label>
                <Input
                  id="new-tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g., Food Safety, Quality Control"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateTag}
                  disabled={createTag.isPending}
                  className="flex-1"
                >
                  {createTag.isPending ? 'Creating...' : 'Create Tag'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTagName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Available Tags */}
      <div className="space-y-3">
        <Label>Available Tags ({availableTags.length})</Label>
        {availableTags.length > 0 ? (
          <Card>
            <CardContent className="pt-6">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {availableTags.map(tag => (
                    <div
                      key={tag.id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleToggleTag(tag.id)}
                    >
                      <Checkbox
                        checked={selectedTags.includes(tag.id)}
                        onCheckedChange={() => handleToggleTag(tag.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{tag.tag_name}</div>
                        {tag.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {tag.description}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {tag.policy_count || 0} {tag.policy_count === 1 ? 'policy' : 'policies'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                All available tags have been selected.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Help Text */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold text-sm mb-2">About Tags</h4>
          <p className="text-xs text-muted-foreground">
            Tags help organize and categorize policies for easier discovery. Use tags to group
            policies by topic, department, or any other relevant criteria. You can create new tags
            or select from existing ones.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
