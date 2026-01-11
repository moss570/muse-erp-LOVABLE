// Approval & Compliance Engine Components
export { ApprovalStatusBadge } from './ApprovalStatusBadge';
export { ApprovalActionsDropdown } from './ApprovalActionsDropdown';
export { ApprovalHistoryPanel } from './ApprovalHistoryPanel';
export { DocumentExpirationBadge, getExpirationStatus } from './DocumentExpirationBadge';
export { ComplianceDocumentsPanel } from './ComplianceDocumentsPanel';
export { ComplianceDocumentUploadDialog } from './ComplianceDocumentUploadDialog';
export { DocumentRenewalDialog } from './DocumentRenewalDialog';

// Re-export types from hooks
export type { ApprovalStatus, ApprovalAction, RelatedTableName } from '@/hooks/useApprovalEngine';
export type { EntityType, ComplianceDocument } from '@/hooks/useComplianceDocuments';
