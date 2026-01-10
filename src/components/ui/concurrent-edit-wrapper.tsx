import React, { useEffect, ReactNode } from 'react';
import { useConcurrentEdit } from '@/hooks/useConcurrentEdit';
import { EditPresenceIndicator } from '@/components/ui/edit-presence-indicator';
import { ConflictDialog } from '@/components/ui/conflict-dialog';
import { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

interface ConcurrentEditWrapperProps {
  resourceType: string;
  resourceId: string | undefined;
  tableName: TableName;
  resourceName?: string;
  enabled?: boolean;
  initialData?: Record<string, unknown>;
  onDataRefresh?: (data: Record<string, unknown>) => void;
  onBeforeSave?: () => Promise<{ canSave: boolean; latestData?: Record<string, unknown> }>;
  children: (props: {
    checkBeforeSave: () => Promise<{ canSave: boolean; latestData?: Record<string, unknown> }>;
    PresenceIndicator: ReactNode;
  }) => ReactNode;
}

/**
 * Wrapper component for adding concurrent editing support to forms.
 * 
 * Usage:
 * ```tsx
 * <ConcurrentEditWrapper
 *   resourceType="purchase_order"
 *   resourceId={purchaseOrder?.id}
 *   tableName="purchase_orders"
 *   resourceName="Purchase Order"
 *   initialData={purchaseOrder}
 *   onDataRefresh={(data) => form.reset(data)}
 * >
 *   {({ checkBeforeSave, PresenceIndicator }) => (
 *     <>
 *       <DialogHeader>
 *         <DialogTitle>Edit PO {PresenceIndicator}</DialogTitle>
 *       </DialogHeader>
 *       <Form onSubmit={async (data) => {
 *         const { canSave } = await checkBeforeSave();
 *         if (!canSave) return;
 *         // proceed with save
 *       }}>
 *         ...
 *       </Form>
 *     </>
 *   )}
 * </ConcurrentEditWrapper>
 * ```
 */
export function ConcurrentEditWrapper({
  resourceType,
  resourceId,
  tableName,
  resourceName = 'record',
  enabled = true,
  initialData,
  onDataRefresh,
  children,
}: ConcurrentEditWrapperProps) {
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
    resourceType,
    resourceId,
    tableName,
    enabled: enabled && !!resourceId,
    resourceName,
    onDataRefresh,
  });

  // Initialize lock when data is loaded
  useEffect(() => {
    if (initialData && resourceId) {
      initializeEdit(initialData);
    }
  }, [initialData, resourceId, initializeEdit]);

  const PresenceIndicator = otherEditors.length > 0 ? (
    <EditPresenceIndicator editors={otherEditors} className="ml-2" />
  ) : null;

  return (
    <>
      {children({ checkBeforeSave, PresenceIndicator })}
      
      <ConflictDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        resourceName={resourceName}
        onKeepLocal={handleKeepLocal}
        onAcceptServer={handleAcceptServer}
        serverUpdatedAt={latestServerData?.updated_at as string | undefined}
      />
    </>
  );
}
