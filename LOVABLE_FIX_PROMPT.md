# LOVABLE FIX PROMPT: User Access Control Security Issues

## 🔴 CRITICAL SECURITY ISSUE - User Access Controls Not Enforced

I have identified critical security vulnerabilities in the Muse ERP system where EMPLOYEE-level users can access nearly all areas of the application that should be restricted. This needs immediate fixing across routes, database policies, and UI.

---

## Problem Summary

**Current State:**
- EMPLOYEE users can access 90%+ of application routes (inventory, purchasing, sales, manufacturing, quality, warehouse, HR, reports, etc.)
- Only Settings routes are properly protected with `RequireRole` component
- Database RLS policies use `auth.uid() IS NOT NULL` instead of role-based checks
- Sidebar navigation shows restricted areas to all users

**Expected State:**
- EMPLOYEE users should have read-only access to limited areas (their own portal, basic inventory views)
- Supervisors should have operational access
- Managers should have full operational + financial access
- Admins should have system-wide access

---

## Fix #1: Add Route Protection to App.tsx

**File:** `src/App.tsx`

**Problem:** Lines 146-366 contain routes that only use `<AppLayout>` (authentication check) without `<RequireRole>` (authorization check).

**Fix Required:**

### Inventory Routes (Lines 149-157)
Wrap with: `<RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}>` for create/edit pages
- Keep view pages accessible to all authenticated users OR
- Add read-only mode for employees

### Purchasing Routes (Lines 160-166)
Wrap with: `<RequireRole allowedRoles={['admin', 'manager']}>` for:
- `/purchasing/orders` and `/purchasing/orders/:id` - PO creation/editing
- `/purchasing/suppliers` - Supplier management

Wrap with: `<RequireRole allowedRoles={['admin', 'manager', 'supervisor']}>` for:
- `/purchasing/receiving` - Receiving operations

### Sales Routes (Lines 211-228)
Wrap with: `<RequireRole allowedRoles={['admin', 'manager', 'supervisor']}>` for:
- All sales routes except basic order viewing

### Manufacturing Routes (Lines 231-257)
Wrap with: `<RequireRole allowedRoles={['admin', 'manager', 'supervisor']}>` for:
- `/manufacturing/dashboard`
- `/manufacturing/lots` and `/manufacturing/lots/new`
- `/manufacturing/recipes`
- `/manufacturing/scheduler`

Keep accessible to production workers:
- `/manufacturing/shop-floor` and `/manufacturing/shop-floor/:workOrderId`

### Quality Routes (Lines 260-283)
Wrap with: `<RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}>` for:
- `/quality/dashboard`
- `/quality/capa`, `/quality/complaints`, `/quality/audits`
- `/quality/lot-traceability`, `/quality/mock-recall-drills`

Keep accessible to QA workers:
- `/quality/work-queue`
- `/qa/receiving-inspections`

### Warehouse Routes (Lines 286-295)
Wrap with: `<RequireRole allowedRoles={['admin', 'manager', 'supervisor']}>` for:
- `/warehouse` - Dashboard

Keep accessible to warehouse workers (all authenticated):
- `/warehouse/putaway`, `/warehouse/pallet-building`
- `/warehouse/issue-to-production`, `/warehouse/transfers`
- `/warehouse/cycle-counts`

### HR Routes (Lines 313-357)
Wrap with: `<RequireRole allowedRoles={['admin', 'manager', 'hr']}>` for:
- `/hr/team` and `/hr/team/:id`
- `/hr/payroll`
- `/hr/pto`
- `/hr/documents`
- `/employees/directory`

Wrap with: `<RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}>` for:
- `/scheduling/employees`

### Reports Routes (Lines 317-327, 360)
Wrap with: `<RequireRole allowedRoles={['admin', 'manager']}>` for:
- `/reports/profit-loss` - Financial reports
- `/analytics/tasks` - Analytics

### Keep Accessible to ALL Authenticated Users
- `/` - Dashboard
- `/my/*` - Employee Portal
- `/my/work-queue`, `/my/schedule`, `/my/training`, `/my/documents`, `/my/time-off`
- `/tasks` - Task Management
- `/chat` - Team Chat
- `/notifications` - Notifications
- `/settings/profile` - User Profile
- `/kiosk/timeclock` - Time Clock

**Example Fix:**
```jsx
// BEFORE (VULNERABLE):
<Route path="/purchasing/orders" element={<AppLayout><PurchaseOrders /></AppLayout>} />

// AFTER (SECURED):
<Route path="/purchasing/orders" element={
  <AppLayout>
    <RequireRole allowedRoles={['admin', 'manager']}>
      <PurchaseOrders />
    </RequireRole>
  </AppLayout>
} />
```

---

## Fix #2: Update Database RLS Policies

**Problem:** Multiple tables use `auth.uid() IS NOT NULL` which allows ANY authenticated user (including EMPLOYEES) to perform operations.

### Required Database Migrations

#### A. Fix Work Orders
**Tables:** `production_work_orders`, `work_order_assignments`

**Current Policy (VULNERABLE):**
```sql
CREATE POLICY "Authenticated users can create work orders" ON production_work_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

**Required Fix:**
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create work orders" ON production_work_orders;
DROP POLICY IF EXISTS "Authenticated users can update work orders" ON production_work_orders;

-- Create new policies
CREATE POLICY "Supervisors and managers can create work orders" ON production_work_orders
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'supervisor') OR
    is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Assigned users and managers can update work orders" ON production_work_orders
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM work_order_assignments WHERE work_order_id = id
    ) OR is_admin_or_manager(auth.uid())
  );
```

#### B. Fix Inventory Lots
**Tables:** `receiving_lots`, `production_lots`

**Required Fix:**
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated can insert receiving lots" ON receiving_lots;
DROP POLICY IF EXISTS "Authenticated can insert production lots" ON production_lots;

-- Receiving lots: restrict to supervisor+ or users in warehouse/receiving department
CREATE POLICY "Warehouse users can create receiving lots" ON receiving_lots
  FOR INSERT WITH CHECK (
    is_admin_or_manager(auth.uid()) OR
    has_role(auth.uid(), 'supervisor')
  );

-- Production lots: restrict to supervisor+ or users in production department
CREATE POLICY "Production supervisors can create production lots" ON production_lots
  FOR INSERT WITH CHECK (
    is_admin_or_manager(auth.uid()) OR
    has_role(auth.uid(), 'supervisor')
  );
```

#### C. Fix Pallets
**Tables:** `pallets`, `pallet_cases`, `pallet_transfers`

**Required Fix:**
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated can insert pallets" ON pallets;
DROP POLICY IF EXISTS "Authenticated can update pallets" ON pallets;
DROP POLICY IF EXISTS "Authenticated can insert pallet cases" ON pallet_cases;
DROP POLICY IF EXISTS "Authenticated can update pallet cases" ON pallet_cases;
DROP POLICY IF EXISTS "Authenticated can insert pallet transfers" ON pallet_transfers;

-- Restrict to warehouse/shipping roles
CREATE POLICY "Warehouse users can create pallets" ON pallets
  FOR INSERT WITH CHECK (
    is_admin_or_manager(auth.uid()) OR
    has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Warehouse users can update pallets" ON pallets
  FOR UPDATE USING (
    is_admin_or_manager(auth.uid()) OR
    has_role(auth.uid(), 'supervisor')
  );

-- Similar for pallet_cases and pallet_transfers
```

#### D. Fix Inventory Holds & Disposal
**Tables:** `inventory_holds`, `disposal_log`, `hold_reason_codes`

**Required Fix:**
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can create inventory holds" ON inventory_holds;
DROP POLICY IF EXISTS "Users can update inventory holds" ON inventory_holds;
DROP POLICY IF EXISTS "Users can create disposal entries" ON disposal_log;
DROP POLICY IF EXISTS "Users can update disposal entries" ON disposal_log;
DROP POLICY IF EXISTS "Authenticated users can manage hold reason codes" ON hold_reason_codes;

-- Restrict holds to QA/supervisor/manager only
CREATE POLICY "QA and managers can create holds" ON inventory_holds
  FOR INSERT WITH CHECK (
    is_admin_or_manager(auth.uid()) OR
    has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "QA and managers can update holds" ON inventory_holds
  FOR UPDATE USING (
    is_admin_or_manager(auth.uid()) OR
    has_role(auth.uid(), 'supervisor')
  );

-- Restrict disposal to managers only
CREATE POLICY "Managers can create disposal entries" ON disposal_log
  FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Managers can update disposal entries" ON disposal_log
  FOR UPDATE USING (is_admin_or_manager(auth.uid()));

-- Restrict hold reason codes to managers
CREATE POLICY "Managers can manage hold reason codes" ON hold_reason_codes
  FOR ALL USING (is_admin_or_manager(auth.uid()));
```

#### E. Fix Receiving Operations
**Tables:** `po_receiving_sessions`, `po_receiving_items`, `receiving_inspections`

**Required Fix:**
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated can insert receiving sessions" ON po_receiving_sessions;
DROP POLICY IF EXISTS "Authenticated can insert receiving items" ON po_receiving_items;
DROP POLICY IF EXISTS "Authenticated can insert inspections" ON receiving_inspections;

-- Restrict to supervisor+ or receiving department
CREATE POLICY "Supervisors can create receiving sessions" ON po_receiving_sessions
  FOR INSERT WITH CHECK (
    is_admin_or_manager(auth.uid()) OR
    has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Supervisors can create receiving items" ON po_receiving_items
  FOR INSERT WITH CHECK (
    is_admin_or_manager(auth.uid()) OR
    has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Supervisors can create inspections" ON receiving_inspections
  FOR INSERT WITH CHECK (
    is_admin_or_manager(auth.uid()) OR
    has_role(auth.uid(), 'supervisor')
  );
```

---

## Fix #3: Update Sidebar Navigation

**File:** `src/components/layout/Sidebar.tsx`

**Problem:** Lines 41-218 define navigation items but only 3 have `requiredRole` set (Operations, Employees, Settings).

**Fix Required:** Add `requiredRole` to appropriate navigation items:

```typescript
const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    // Accessible to all
  },
  {
    title: 'My Portal',
    href: '/my',
    icon: User,
    // Accessible to all
  },
  {
    title: 'Tasks',
    href: '/tasks',
    icon: ClipboardList,
    // Accessible to all
  },
  {
    title: 'Chat',
    href: '/chat',
    icon: MessageSquare,
    // Accessible to all
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: Package,
    requiredRole: 'supervisor', // ADD THIS
    children: [...],
  },
  {
    title: 'Manufacturing',
    href: '/manufacturing',
    icon: Factory,
    requiredRole: 'supervisor', // ADD THIS
    children: [...],
  },
  {
    title: 'Purchasing',
    href: '/purchasing',
    icon: ShoppingCart,
    requiredRole: 'supervisor', // ADD THIS
    children: [...],
  },
  {
    title: 'Sales',
    href: '/sales',
    icon: Truck,
    requiredRole: 'supervisor', // ADD THIS
    children: [...],
  },
  {
    title: 'Quality & Safety',
    href: '/quality',
    icon: ClipboardCheck,
    requiredRole: 'supervisor', // ADD THIS
    children: [...],
  },
  {
    title: 'Warehouse',
    href: '/warehouse',
    icon: Package,
    requiredRole: 'supervisor', // ADD THIS
    children: [...],
  },
  {
    title: 'Operations',
    href: '/operations',
    icon: CalendarCheck,
    requiredRole: 'manager', // ALREADY SET
    children: [...],
  },
  {
    title: 'Scheduling',
    href: '/scheduling',
    icon: Calendar,
    requiredRole: 'supervisor', // ADD THIS
    children: [...],
  },
  {
    title: 'Employees',
    href: '/employees',
    icon: Users,
    requiredRole: 'manager', // ALREADY SET
    children: [...],
  },
  {
    title: 'Reports & KPIs',
    href: '/reports',
    icon: BarChart3,
    requiredRole: 'manager', // ADD THIS
    children: [...],
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: FileText,
    requiredRole: 'supervisor', // ADD THIS
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    requiredRole: 'manager', // ALREADY SET
    children: [...],
  },
];
```

**Also Update the `canAccess` Function (Lines 255-260):**

```typescript
const canAccess = (item: NavItem) => {
  if (!item.requiredRole) return true;
  if (item.requiredRole === 'admin') return isAdmin;
  if (item.requiredRole === 'manager') return isManager;
  if (item.requiredRole === 'supervisor') return isSupervisor; // ADD THIS
  if (item.requiredRole === 'employee') return true; // ADD THIS
  return false; // Default deny
};
```

**Note:** You'll need to ensure `isSupervisor` is available from `useAuth()` hook in `src/contexts/AuthContext.tsx` (it should already be there based on the audit).

---

## Fix #4: Add Permission Checks to Pages

**Problem:** Only 12 pages currently implement permission checks. All other pages should check permissions and either:
1. Show read-only view for employees
2. Redirect to access denied page
3. Hide create/edit/delete buttons

**Files needing permission checks (examples):**

Add this pattern to pages that are missing it:

```typescript
import { usePermissions } from '@/hooks/usePermission';

export default function PageName() {
  const { checkPermission, isAdmin } = usePermissions();

  const canCreate = isAdmin || checkPermission('resource.create', 'full');
  const canEdit = isAdmin || checkPermission('resource.edit', 'full');
  const canDelete = isAdmin || checkPermission('resource.delete', 'full');
  const canView = isAdmin || checkPermission('resource.view', 'full') || checkPermission('resource.view', 'read');

  // Then use these flags to conditionally render buttons/forms
}
```

**Pages that need this added:**
- All inventory pages (Materials.tsx already has it ✓)
- All manufacturing pages
- All quality pages
- All warehouse pages
- All sales pages
- All HR pages
- All report pages

---

## Fix #5: Create Helper Role Check Functions (Optional Enhancement)

To make RLS policies easier to write, consider adding these helper functions to the database:

```sql
-- Check if user has supervisor or higher role
CREATE OR REPLACE FUNCTION is_supervisor_or_higher(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id
    AND role IN ('supervisor', 'manager', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

Then use in policies:
```sql
CREATE POLICY "Supervisors can manage X" ON table_name
  FOR ALL USING (is_supervisor_or_higher(auth.uid()));
```

---

## Testing Checklist

After implementing these fixes, test with each role:

### Test as EMPLOYEE
- [ ] Cannot access `/purchasing/orders` - should see "Access Denied" or redirect
- [ ] Cannot access `/manufacturing/lots/new` - should see "Access Denied"
- [ ] Cannot access `/reports/profit-loss` - should see "Access Denied"
- [ ] Cannot access `/settings/users` - should see "Access Denied"
- [ ] Cannot see Inventory, Manufacturing, Purchasing, etc. in sidebar
- [ ] CAN access `/my` portal
- [ ] CAN access `/my/schedule`, `/my/documents`, etc.
- [ ] CAN access `/tasks` and `/chat`
- [ ] Database: Cannot create work orders (should fail with RLS error)
- [ ] Database: Cannot create inventory holds (should fail with RLS error)

### Test as SUPERVISOR
- [ ] CAN access inventory pages
- [ ] CAN access manufacturing pages
- [ ] CAN access warehouse operations
- [ ] CAN create work orders
- [ ] CANNOT access financial reports
- [ ] CANNOT access user management

### Test as MANAGER
- [ ] CAN access all operational pages
- [ ] CAN access financial reports
- [ ] CAN access user management (read-only)
- [ ] CAN approve purchase orders

### Test as ADMIN
- [ ] CAN access everything
- [ ] CAN modify system settings
- [ ] CAN manage user permissions

---

## Priority Order

1. **CRITICAL (Do First):** Fix #1 - Add route protection to App.tsx
2. **CRITICAL (Do First):** Fix #2 - Update database RLS policies for work orders, inventory holds, disposal
3. **HIGH:** Fix #3 - Update sidebar navigation visibility
4. **MEDIUM:** Fix #4 - Add permission checks to remaining pages
5. **OPTIONAL:** Fix #5 - Create helper functions

---

## Summary

These fixes will ensure that:
- ✅ EMPLOYEE users can only access their designated portal and basic features
- ✅ Route-level protection prevents unauthorized page access
- ✅ Database-level RLS prevents unauthorized data operations
- ✅ UI-level controls hide restricted features from view
- ✅ System follows principle of least privilege
- ✅ Three-layer security model (Route → UI → Database)

**Expected Outcome:** EMPLOYEE users will have a focused, limited experience appropriate to their role, while supervisors, managers, and admins have progressively more access based on their responsibilities.

---

**Please implement these fixes to secure the user access controls in the Muse ERP system.**
