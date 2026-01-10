# Concurrent Editing Pattern

This document describes how to implement concurrent editing protection in forms across the application.

## Overview

The concurrent editing system provides two layers of protection:

1. **Optimistic Locking** - Detects when another user has modified a record since you loaded it
2. **Real-time Presence** - Shows who else is currently editing the same record

## Quick Start

### Option 1: Using the Wrapper Component (Recommended)

```tsx
import { ConcurrentEditWrapper } from '@/components/ui/concurrent-edit-wrapper';

function MyFormDialog({ record, open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ConcurrentEditWrapper
          resourceType="my_record"
          resourceId={record?.id}
          tableName="my_table"
          resourceName="My Record"
          initialData={record}
          onDataRefresh={(data) => {
            // Reload form with server data
            form.reset(data);
          }}
        >
          {({ checkBeforeSave, PresenceIndicator }) => (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Edit Record
                  {PresenceIndicator}
                </DialogTitle>
              </DialogHeader>
              
              <Form onSubmit={async (data) => {
                const { canSave } = await checkBeforeSave();
                if (!canSave) return; // Conflict dialog will show
                
                // Proceed with save
                await saveMutation.mutateAsync(data);
              }}>
                {/* Form fields */}
              </Form>
            </>
          )}
        </ConcurrentEditWrapper>
      </DialogContent>
    </Dialog>
  );
}
```

### Option 2: Using the Hook Directly

```tsx
import { useConcurrentEdit } from '@/hooks/useConcurrentEdit';
import { EditPresenceIndicator } from '@/components/ui/edit-presence-indicator';
import { ConflictDialog } from '@/components/ui/conflict-dialog';

function MyFormDialog({ record, open, onOpenChange }) {
  const {
    otherEditors,
    showConflictDialog,
    setShowConflictDialog,
    initializeEdit,
    checkBeforeSave,
    handleKeepLocal,
    handleAcceptServer,
    latestServerData,
  } = useConcurrentEdit({
    resourceType: 'my_record',
    resourceId: record?.id,
    tableName: 'my_table',
    resourceName: 'My Record',
    onDataRefresh: (data) => form.reset(data),
  });

  // Initialize when record loads
  useEffect(() => {
    if (record) {
      initializeEdit(record);
    }
  }, [record, initializeEdit]);

  const handleSubmit = async (data) => {
    const { canSave } = await checkBeforeSave();
    if (!canSave) return;
    
    await saveMutation.mutateAsync(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Record
            {otherEditors.length > 0 && (
              <EditPresenceIndicator editors={otherEditors} />
            )}
          </DialogTitle>
        </DialogHeader>
        
        {/* Form content */}
        
        <ConflictDialog
          open={showConflictDialog}
          onOpenChange={setShowConflictDialog}
          resourceName="My Record"
          onKeepLocal={handleKeepLocal}
          onAcceptServer={handleAcceptServer}
          serverUpdatedAt={latestServerData?.updated_at}
        />
      </DialogContent>
    </Dialog>
  );
}
```

## Components

### `useConcurrentEdit` Hook

The main hook that combines optimistic locking and presence tracking.

**Options:**
- `resourceType` - Identifier for the type of resource (e.g., 'purchase_order')
- `resourceId` - The UUID of the specific record being edited
- `tableName` - The Supabase table name (must be valid table)
- `resourceName` - Human-readable name for error messages
- `onDataRefresh` - Callback when user accepts server changes

**Returns:**
- `otherEditors` - Array of other users editing this record
- `checkBeforeSave` - Async function to call before saving
- `showConflictDialog` - Whether to show conflict dialog
- `handleKeepLocal` - Resolve conflict by keeping local changes
- `handleAcceptServer` - Resolve conflict by accepting server changes

### `EditPresenceIndicator` Component

Shows a badge when other users are editing.

```tsx
<EditPresenceIndicator 
  editors={otherEditors} 
  showWarning={true}  // Shows warning icon
  className="ml-2"
/>
```

### `ConflictDialog` Component

Modal dialog for resolving conflicts.

```tsx
<ConflictDialog
  open={showConflictDialog}
  onOpenChange={setShowConflictDialog}
  resourceName="Purchase Order"
  onKeepLocal={handleKeepLocal}
  onAcceptServer={handleAcceptServer}
  serverUpdatedAt={latestServerData?.updated_at}
/>
```

### `ConcurrentEditWrapper` Component

Convenience wrapper that combines all the above.

## How It Works

### Optimistic Locking Flow

1. When form opens, the current `updated_at` timestamp is stored
2. Before save, the server is queried for the latest `updated_at`
3. If timestamps differ, a conflict is detected
4. User can choose to:
   - **Keep local changes** - Overwrites server (force save)
   - **Reload latest** - Discards local changes, reloads form

### Presence Tracking Flow

1. When form opens, user registers as an "active editor" in the database
2. A heartbeat is sent every 30 seconds to keep the session alive
3. Other users opening the same record see who's editing
4. When form closes, the editor session is removed
5. Stale sessions (>2 min without heartbeat) are auto-cleaned

## Database Requirements

The system requires:
- An `updated_at` column on tables being edited (most already have this)
- The `active_editors` table (created via migration)

## Best Practices

1. **Always call `checkBeforeSave()` before mutations**
2. **Show the PresenceIndicator prominently** so users know others are editing
3. **Handle the `onDataRefresh` callback** to properly reload form state
4. **Use meaningful `resourceName` values** for clear error messages

## Supported Tables

The system works with any table that has:
- `id` column (UUID)
- `updated_at` column (timestamp)

Currently integrated with:
- `purchase_orders`
- `materials`
- `suppliers`
- `customers`
- `products`
- `locations`
- `machines`
- `departments`
