

# Plan: Complete Policy Form Enhancement

## Overview
Enhance the PolicyFormDialog by adding all missing database fields including Owner, Reviewer, Approver, Expiry Date, Template flag, and Supersedes (versioning) selection. Also fix the submit button to display contextually appropriate text.

## Summary of Changes

### Fields to Add

| Field | Purpose | UI Component |
|-------|---------|--------------|
| `owner_id` | Document owner responsible for the policy | EmployeeCombobox |
| `reviewer_id` | Person assigned to review the policy | EmployeeCombobox |
| `approver_id` | Person with authority to approve the policy | EmployeeCombobox |
| `expiry_date` | Date when policy expires/needs renewal | Date picker |
| `is_template` | Mark policy as a reusable template | Checkbox/Switch |
| `supersedes_id` | Link to previous policy this one replaces | Policy dropdown |

### Button Text Fix
- **"Save Changes"** when editing an existing policy
- **"Create Policy"** when creating a new policy
- Loading states: "Saving..." vs "Creating..."

---

## Visual Layout

The form will be organized into logical sections:

```text
+--------------------------------------------------+
| BASIC INFORMATION                                |
| - Policy Number, Title, Summary                  |
| - Type, Category, Department                     |
+--------------------------------------------------+
| DOCUMENT OWNERSHIP & WORKFLOW                    |
| +----------------+ +----------------+            |
| | Owner          | | Reviewer       |            |
| | [Employee ▼]   | | [Employee ▼]   |            |
| +----------------+ +----------------+            |
| +----------------+                               |
| | Approver       |                               |
| | [Employee ▼]   |                               |
| +----------------+                               |
+--------------------------------------------------+
| DATES                                            |
| +----------------+ +----------------+ +--------+ |
| | Effective Date | | Review Date    | | Expiry | |
| | [Date picker]  | | [Date picker]  | | [Date] | |
| +----------------+ +----------------+ +--------+ |
+--------------------------------------------------+
| ADVANCED OPTIONS                                 |
| [ ] This is a template (can be copied)           |
| Supersedes Policy: [Select policy... ▼]          |
+--------------------------------------------------+
| CONTENT                                          |
| [Rich text editor / extracted content]           |
+--------------------------------------------------+
| ATTACHMENTS & MAPPINGS                           |
+--------------------------------------------------+
|                    [Save Changes] / [Cancel]     |
+--------------------------------------------------+
```

---

## Technical Implementation

### Files to Modify

**`src/components/policies/PolicyFormDialog.tsx`**

#### 1. Update Imports
```typescript
import EmployeeCombobox from '@/components/shared/EmployeeCombobox';
import { Switch } from '@/components/ui/switch';
```

#### 2. Extend formData State
Add new fields to the initial state object:
```typescript
const [formData, setFormData] = useState({
  // Existing fields...
  policy_number: "",
  title: "",
  summary: "",
  content: "",
  type_id: "",
  category_id: "",
  department_id: "",
  effective_date: "",
  review_date: "",
  requires_acknowledgement: false,
  acknowledgement_frequency_days: 365,
  
  // NEW FIELDS
  owner_id: "",
  reviewer_id: "",
  approver_id: "",
  expiry_date: "",
  is_template: false,
  supersedes_id: "",
});
```

#### 3. Fetch Policies for Supersedes Dropdown
Add a query to get all policies (excluding current one when editing):
```typescript
const { data: allPolicies } = useQuery({
  queryKey: ['policies-for-supersedes'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('policies')
      .select('id, policy_number, title')
      .order('policy_number');
    if (error) throw error;
    return data;
  },
});
```

#### 4. Pre-populate When Editing
Update the useEffect that populates form when editing:
```typescript
if (policy) {
  setFormData({
    // Existing fields...
    owner_id: policy.owner_id || "",
    reviewer_id: policy.reviewer_id || "",
    approver_id: policy.approver_id || "",
    expiry_date: policy.expiry_date || "",
    is_template: policy.is_template || false,
    supersedes_id: policy.supersedes_id || "",
  });
}
```

#### 5. Add Form UI Sections

**Document Ownership & Workflow Section:**
```typescript
<div className="space-y-4">
  <h3 className="text-sm font-medium text-muted-foreground">
    Document Ownership & Workflow
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label htmlFor="owner">Document Owner</Label>
      <EmployeeCombobox
        value={formData.owner_id}
        onChange={(v) => setFormData({ ...formData, owner_id: v || "" })}
        placeholder="Select owner..."
      />
    </div>
    <div>
      <Label htmlFor="reviewer">Reviewer</Label>
      <EmployeeCombobox
        value={formData.reviewer_id}
        onChange={(v) => setFormData({ ...formData, reviewer_id: v || "" })}
        placeholder="Select reviewer..."
      />
    </div>
    <div>
      <Label htmlFor="approver">Approver</Label>
      <EmployeeCombobox
        value={formData.approver_id}
        onChange={(v) => setFormData({ ...formData, approver_id: v || "" })}
        placeholder="Select approver..."
      />
    </div>
  </div>
</div>
```

**Expiry Date Field** (add to dates section):
```typescript
<div>
  <Label htmlFor="expiry_date">Expiry Date</Label>
  <Input
    id="expiry_date"
    type="date"
    value={formData.expiry_date}
    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
  />
</div>
```

**Advanced Options Section:**
```typescript
<div className="space-y-4 border-t pt-4">
  <h3 className="text-sm font-medium text-muted-foreground">
    Advanced Options
  </h3>
  
  {/* Template Toggle */}
  <div className="flex items-center space-x-2">
    <Switch
      id="is_template"
      checked={formData.is_template}
      onCheckedChange={(checked) => 
        setFormData({ ...formData, is_template: checked })
      }
    />
    <Label htmlFor="is_template">
      This is a template (can be copied to create new policies)
    </Label>
  </div>
  
  {/* Supersedes Dropdown */}
  <div>
    <Label htmlFor="supersedes">Supersedes Policy</Label>
    <Select
      value={formData.supersedes_id}
      onValueChange={(v) => setFormData({ ...formData, supersedes_id: v })}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select policy this replaces..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">None</SelectItem>
        {allPolicies
          ?.filter(p => p.id !== policy?.id) // Exclude current policy
          .map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.policy_number} - {p.title}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground mt-1">
      If this policy replaces an older version, select it here
    </p>
  </div>
</div>
```

#### 6. Update Mutations
Include all new fields in both create and update mutations:
```typescript
// In updatePolicyWithVersion.mutate call:
owner_id: formData.owner_id || null,
reviewer_id: formData.reviewer_id || null,
approver_id: formData.approver_id || null,
expiry_date: formData.expiry_date || null,
is_template: formData.is_template,
supersedes_id: formData.supersedes_id || null,

// Same for createPolicy.mutate call
```

#### 7. Fix Button Text
```typescript
<Button onClick={handleSubmit} disabled={...}>
  {isSubmitting ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      {policy ? "Saving..." : "Creating..."}
    </>
  ) : (
    <>
      {(pendingFiles.length > 0 || sqfMappings.filter(m => m.selected).length > 0) && (
        <Paperclip className="h-4 w-4 mr-2" />
      )}
      {policy ? "Save Changes" : "Create Policy"}
      {sqfMappings.filter(m => m.selected).length > 0 && (
        <span className="ml-1">+ {sqfMappings.filter(m => m.selected).length} Mappings</span>
      )}
    </>
  )}
</Button>
```

---

## Feature Details

### Template Feature (`is_template`)
- When enabled, marks the policy as a reusable template
- Templates can be filtered/displayed separately in the policy list
- Future enhancement: "Create from Template" button that copies template content

### Supersedes Feature (`supersedes_id`)
- Links to a previous policy that this one replaces
- Creates a document lineage/chain
- Could display "Superseded by" on the old policy detail page
- Helps with compliance audits tracking policy evolution

### Workflow Fields (Reviewer/Approver)
- Assigns specific people to the review and approval workflow
- Can be used for:
  - Email notifications when review is due
  - Approval workflows before publishing
  - Audit trail of who reviewed/approved

---

## Files to Modify

1. **`src/components/policies/PolicyFormDialog.tsx`**
   - Add imports for EmployeeCombobox and Switch
   - Extend formData state with 6 new fields
   - Add query to fetch policies for supersedes dropdown
   - Update useEffect for pre-populating when editing
   - Add UI sections for new fields
   - Update both create and update mutations
   - Fix button text logic

