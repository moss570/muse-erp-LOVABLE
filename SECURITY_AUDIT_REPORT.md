# Security Audit Report: User Access Controls
**Date:** 2026-01-24
**Auditor:** Claude (AI Assistant)
**Scope:** Complete audit of user access controls across routes, UI, and database

---

## Executive Summary

**CRITICAL SECURITY VULNERABILITIES IDENTIFIED**

A comprehensive audit of the Muse ERP system has revealed **severe security gaps** that allow EMPLOYEE-level users to access restricted areas and perform unauthorized operations. The issues span three layers:

1. **Route Protection Layer**: 90%+ of application routes lack role-based access controls
2. **Database Layer**: Multiple critical tables have overly permissive RLS policies
3. **UI Layer**: Navigation filtering is incomplete and inconsistent

**Risk Level:** 🔴 **CRITICAL** - Immediate remediation required

---

## 1. ROUTE PROTECTION VULNERABILITIES

### Issue Summary
**Location:** `src/App.tsx` (lines 146-366)

**Problem:** The vast majority of application routes are wrapped only in `<AppLayout>`, which merely checks if a user is authenticated. There are NO role-based access controls using `<RequireRole>` component.

### Routes WITHOUT Proper Protection (Accessible to ALL authenticated users, including EMPLOYEES):

#### Inventory Module (Lines 149-157)
- `/inventory/on-hand` - Material Inventory
- `/inventory/materials` - Materials Master Data
- `/inventory/products` - Products Master Data
- `/inventory/open-containers` - Container Tracking
- `/inventory/hold-log` - Inventory Hold Log
- `/inventory/disposal-log` - Disposal Records
- `/inventory/alerts` - Inventory Alerts
- `/inventory/3pl` - Third-Party Logistics Dashboard

#### Purchasing Module (Lines 160-166)
- `/purchasing/suppliers` - Supplier Management
- `/purchasing/suppliers/scoring` - Supplier Scoring
- `/purchasing/orders` - Purchase Orders (View/Create/Edit)
- `/purchasing/orders/:id` - PO Details
- `/purchasing/receiving` - Receiving Operations

#### Sales Module (Lines 211-228)
- `/sales/customers` - Customer Management
- `/sales/orders` - Sales Orders
- `/sales/orders/:id` - Order Details
- `/sales/invoices` - Invoice Management
- `/sales/payments` - Payment Processing
- `/sales/returns` - Returns & RMAs
- `/sales/customer-pricing` - Customer Pricing
- `/sales/fulfillment-reports` - Fulfillment Reports

#### Manufacturing Module (Lines 231-257)
- `/manufacturing/dashboard` - Production Dashboard
- `/manufacturing/production` - Production Execution
- `/manufacturing/lots` - Manufacturing Lots
- `/manufacturing/lots/new` - Create Manufacturing Lot
- `/manufacturing/lots/:id` - Lot Details
- `/manufacturing/recipes` - Recipe Management
- `/manufacturing/recipes/:id` - Recipe Details
- `/manufacturing/shop-floor` - Shop Floor Interface
- `/manufacturing/shop-floor/:workOrderId` - Work Order Details
- `/manufacturing/scheduler` - Production Scheduler
- `/manufacturing/qa-tests` - Batch QA Tests
- `/production/issue-requests` - Issue Requests
- `/production/issue-requests/new` - Create Issue Request

#### Quality Module (Lines 260-283)
- `/quality/dashboard` - QA Dashboard
- `/quality/work-queue` - QA Work Queue
- `/quality/capa` - CAPA Management
- `/quality/capa-analytics` - CAPA Analytics
- `/quality/complaints` - Customer Complaints
- `/quality/audits` - Audit Management
- `/quality/override-requests` - Override Requests
- `/quality/lot-traceability` - Lot Traceability
- `/quality/mock-recall-drills` - Mock Recall Drills
- `/quality/non-conformities` - Non-Conformities
- `/quality/nc-analytics` - NC Analytics
- `/qa/receiving-inspections` - Receiving Inspections
- `/qa/receiving-inspection/:sessionId` - Inspection Sessions

#### Warehouse Module (Lines 286-295)
- `/warehouse` - Warehouse Dashboard
- `/warehouse/putaway` - Putaway Operations
- `/warehouse/putaway/:taskId` - Putaway Task Details
- `/warehouse/issue-to-production` - Issue to Production
- `/warehouse/issue-to-production/:requestId` - Fulfill Issue Request
- `/warehouse/cycle-counts` - Cycle Count Management
- `/warehouse/cycle-counts/:countId` - Cycle Count Entry
- `/warehouse/cycle-counts/:countId/review` - Cycle Count Review
- `/warehouse/pallet-building` - Pallet Building
- `/warehouse/transfers` - Inventory Transfers

#### HR & Employee Module (Lines 313-357)
- `/hr/team` - Team Roster
- `/hr/team/:id` - Employee Detail
- `/hr/payroll` - Payroll Export
- `/hr/pto` - PTO Management
- `/hr/documents` - HR Documents
- `/employees/directory` - Employee Directory
- `/scheduling/employees` - Employee Schedule

#### Reports & Analytics (Lines 317-327, 360)
- `/reports/profit-loss` - Profit & Loss Report
- `/analytics/tasks` - Task Analytics

#### Other Modules
- `/tasks` - Task Management (Line 347)
- `/chat` - Team Chat (Line 345)
- `/notifications` - Notifications (Line 363)

### Routes PROPERLY Protected (Lines 168-207)
Only the Settings module routes are wrapped with:
```jsx
<RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}>
```

This includes:
- `/settings/*` - All settings pages
- `/settings/users` - User Management
- `/settings/permissions` - Role Permissions

**Exception:** `/settings/profile` is intentionally accessible to ALL users (Line 170)

### Impact
**EMPLOYEE users can:**
- View all company data (customers, suppliers, materials, products, financials)
- Access operational dashboards and analytics
- Navigate to restricted pages via direct URL
- See sensitive financial information (P&L reports, customer pricing)
- View employee records and HR data
- Access quality and compliance records

---

## 2. DATABASE RLS POLICY VULNERABILITIES

### Critical Tables with Overly Permissive Policies

#### A. Production Work Orders
**File:** `supabase/migrations/20260113003254_631fe901-da94-4fbe-8f37-d871acce9d66.sql`

**Vulnerable Policies:**
```sql
-- ANY authenticated user can create work orders
CREATE POLICY "Authenticated users can create work orders" ON production_work_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ANY authenticated user can update work orders
CREATE POLICY "Authenticated users can update work orders" ON production_work_orders
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ANY authenticated user can manage assignments
CREATE POLICY "Authenticated users can manage assignments" ON work_order_assignments
  FOR ALL USING (auth.uid() IS NOT NULL);
```

**Risk:** EMPLOYEES can create, modify, and assign production work orders without authorization.

---

#### B. Inventory & Production Lots
**File:** `supabase/migrations/20260109113400_c4fd066a-95ea-460f-89e9-270267503371.sql`

**Vulnerable Policies:**
```sql
-- ANY authenticated user can insert receiving lots
CREATE POLICY "Authenticated can insert receiving lots" ON receiving_lots
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ANY authenticated user can insert production lots
CREATE POLICY "Authenticated can insert production lots" ON production_lots
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ANY authenticated user can insert/update pallets
CREATE POLICY "Authenticated can insert pallets" ON pallets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update pallets" ON pallets
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ANY authenticated user can insert/update pallet cases
CREATE POLICY "Authenticated can insert pallet cases" ON pallet_cases
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update pallet cases" ON pallet_cases
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ANY authenticated user can insert pallet transfers
CREATE POLICY "Authenticated can insert pallet transfers" ON pallet_transfers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

**Risk:** EMPLOYEES can:
- Create fake inventory records
- Manipulate lot numbers and traceability
- Create unauthorized pallet transfers
- Alter production lot data

---

#### C. Inventory Holds & Disposal
**Files:**
- `supabase/migrations/20260120023205_73a2a6d7-0f6b-4cdb-abd2-4417fde7b792.sql`
- `supabase/migrations/20260120023815_5ede3be6-ed0c-41cb-a191-ef6617070bb3.sql`

**Vulnerable Policies:**
```sql
-- ANY authenticated user can manage hold reason codes
CREATE POLICY "Authenticated users can manage hold reason codes" ON hold_reason_codes
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ANY authenticated user can create/update holds
CREATE POLICY "Users can create inventory holds" ON inventory_holds
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update inventory holds" ON inventory_holds
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ANY authenticated user can create/update disposal records
CREATE POLICY "Users can create disposal entries" ON disposal_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update disposal entries" ON disposal_log
  FOR UPDATE USING (auth.uid() IS NOT NULL);
```

**Risk:** EMPLOYEES can:
- Place holds on inventory without QA/manager approval
- Mark items as disposed without authorization
- Create/modify hold reason codes

---

#### D. Purchase Order Receiving
**File:** `supabase/migrations/20260110021147_d7d3874a-eabc-4fe4-8465-5e40b45dfaac.sql`

**Vulnerable Policies:**
```sql
-- ANY authenticated user can create receiving sessions
CREATE POLICY "Authenticated can insert receiving sessions" ON po_receiving_sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ANY authenticated user can create receiving items
CREATE POLICY "Authenticated can insert receiving items" ON po_receiving_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ANY authenticated user can create inspections
CREATE POLICY "Authenticated can insert inspections" ON receiving_inspections
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

**Note:** Purchase order creation itself IS properly restricted to managers:
```sql
CREATE POLICY "Admins and managers can insert POs" ON purchase_orders
  FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
```

**Risk:** While PO creation is restricted, EMPLOYEES can still receive against POs and create receiving records.

---

### Properly Secured Tables (Examples of Good Implementation)

#### Materials, Products, Suppliers, Customers
```sql
-- Read: All authenticated users
CREATE POLICY "Materials viewable by authenticated" ON materials
  FOR SELECT USING (true);

-- Write: Admins and managers only
CREATE POLICY "Admins and managers can insert materials" ON materials
  FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "Admins and managers can update materials" ON materials
  FOR UPDATE USING (is_admin_or_manager(auth.uid()));
```

#### Employee Data
```sql
-- Employees can view own record, managers can view all
CREATE POLICY "Employees can view own record" ON employees
  FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Managers can view all employees" ON employees
  FOR SELECT USING (is_admin_or_manager(auth.uid()));

-- Only managers can modify employee records
CREATE POLICY "Managers can manage employees" ON employees
  FOR ALL USING (is_admin_or_manager(auth.uid()));
```

---

## 3. UI/NAVIGATION VULNERABILITIES

### Sidebar Navigation
**File:** `src/components/layout/Sidebar.tsx`

**Problem:** Only 3 navigation sections have `requiredRole` restrictions:
- Operations: `requiredRole: 'manager'` (Line 160)
- Employees: `requiredRole: 'manager'` (Line 179)
- Settings: `requiredRole: 'manager'` (Line 206)

All other navigation items are visible to ALL authenticated users, including EMPLOYEES:
- Inventory
- Manufacturing
- Purchasing
- Sales
- Quality & Safety
- Warehouse
- Scheduling
- Reports & KPIs
- Documents
- Tasks
- Chat
- My Portal

**Impact:** EMPLOYEES see navigation links to areas they shouldn't access, creating confusion and security risks.

---

### Component-Level Permission Checks

**Good Examples Found:**
Some pages DO implement internal permission checks using the `usePermissions()` hook:

**`src/pages/inventory/Materials.tsx` (Lines 55-59):**
```typescript
const { checkPermission, isAdmin } = usePermissions();

const canCreate = isAdmin || checkPermission('materials.create', 'full');
const canEdit = isAdmin || checkPermission('materials.edit', 'full');
const canDelete = isAdmin || checkPermission('materials.delete', 'full');
```

**`src/pages/purchasing/PurchaseOrders.tsx` (Lines 86-90):**
```typescript
const { checkPermission, isAdmin } = usePermissions();

const canCreate = isAdmin || checkPermission('purchasing.orders', 'full');
const canEdit = isAdmin || checkPermission('purchasing.orders', 'full');
const canDelete = isAdmin || checkPermission('purchasing.orders', 'full');
```

**Problem:** These checks only:
1. Disable Create/Edit/Delete buttons in the UI
2. Do NOT prevent page access
3. Do NOT prevent viewing data (queries run regardless)
4. Are inconsistently applied across pages

**Grep Results:** Only 12 out of 100+ page files implement permission checks:
- Materials.tsx, Products.tsx
- Customers.tsx
- PurchaseOrders.tsx, PurchaseOrderDetail.tsx
- Suppliers.tsx
- Locations.tsx, DocumentRequirements.tsx
- QAApprovalRules.tsx, RolePermissions.tsx
- OverrideRequests.tsx
- ShopFloor.tsx

---

## 4. PERMISSION SYSTEM ARCHITECTURE (Current Implementation)

### Role Hierarchy (From Database Schema)
```
admin      ─┐ (Full system access)
hr         ─┤ (HR-specific access)
manager    ─┤ (Department management)
supervisor ─┤ (Team oversight, limited write)
employee   ─┘ (Read-only, minimal access) ← VULNERABLE ROLE
```

### Expected Permissions for EMPLOYEE Role
**From:** `supabase/migrations/20260109233856_647602a1-2cfe-4229-8c6e-be4c80f99d85.sql`

EMPLOYEE role should have:
- **Read-only** access to main pages (inventory, purchasing, sales views)
- **Export** capabilities only
- **NO** create/edit/delete permissions
- **NO** settings access
- **NO** financial data access
- **NO** HR data access (except own records)

### Current Reality
Due to missing route protection and permissive RLS policies, EMPLOYEES currently have:
- ✅ Full read access to ALL data
- ✅ Create/edit/delete access to production work orders
- ✅ Create/edit access to inventory lots, pallets, holds, disposals
- ✅ Create access to receiving records
- ✅ Access to financial reports (P&L)
- ✅ Access to all operational dashboards
- ⚠️ Only UI buttons are disabled (easily bypassed)

---

## 5. VULNERABILITY SEVERITY MATRIX

| Vulnerability | Location | Severity | Impact |
|---------------|----------|----------|--------|
| Unprotected Routes | App.tsx | 🔴 CRITICAL | All users can access 90%+ of application |
| Work Order RLS | Database | 🔴 CRITICAL | Unauthorized production scheduling |
| Inventory Lot RLS | Database | 🔴 CRITICAL | Inventory manipulation, traceability loss |
| Inventory Holds RLS | Database | 🔴 CRITICAL | Unauthorized quarantine/release |
| Disposal Log RLS | Database | 🟡 HIGH | Unauthorized disposal records |
| Receiving RLS | Database | 🟡 HIGH | Unauthorized receiving operations |
| Pallet RLS | Database | 🟡 HIGH | Warehouse data manipulation |
| Navigation Visibility | Sidebar | 🟡 HIGH | User confusion, accessibility |
| Inconsistent UI Checks | Pages | 🟢 MEDIUM | Incomplete protection layer |

---

## 6. RECOMMENDED FIXES

### Priority 1: CRITICAL (Implement Immediately)

#### A. Add Route Protection for All Modules
**File:** `src/App.tsx`

Wrap all non-employee routes with `<RequireRole>` component. Define access requirements for each module:

**Recommended Role Requirements:**
- **Inventory (View):** All users
- **Inventory (Edit):** supervisor, manager, admin
- **Purchasing:** manager, admin (some pages: supervisor)
- **Sales:** supervisor, manager, admin
- **Manufacturing:** supervisor, manager, admin
- **Quality:** supervisor, manager, admin (some pages: all users)
- **Warehouse:** warehouse workers, supervisor, manager, admin
- **HR:** hr, manager, admin
- **Reports:** manager, admin
- **Settings:** supervisor, manager, admin, hr

#### B. Fix Database RLS Policies
**Priority Table Fixes:**

1. **production_work_orders** - Restrict INSERT to supervisor+, UPDATE to assigned users or managers
2. **receiving_lots** - Restrict INSERT to warehouse/receiving roles
3. **production_lots** - Restrict INSERT to production supervisors+
4. **inventory_holds** - Restrict to QA/manager roles only
5. **disposal_log** - Restrict to manager roles only
6. **pallets, pallet_cases, pallet_transfers** - Restrict to warehouse/shipping roles

#### C. Update Sidebar Navigation Roles
**File:** `src/components/layout/Sidebar.tsx`

Add `requiredRole` to all navigation items based on who should see them.

---

### Priority 2: HIGH (Implement Soon)

#### A. Add Role-Based View Components
Create wrapper components that hide entire pages for unauthorized users (not just buttons).

#### B. Implement Department-Based Access
For operational roles (warehouse, receiving, production), add department-based RLS policies.

#### C. Audit All Page Components
Ensure all pages implement permission checks using `usePermissions()` hook.

---

### Priority 3: MEDIUM (Implement After Critical Fixes)

#### A. Add Audit Logging
Track when users attempt to access restricted resources.

#### B. Add Permission Override Tracking
Log when admins perform actions on behalf of others.

#### C. Add Session-Level Permission Caching
Optimize performance by caching permission checks.

---

## 7. TESTING RECOMMENDATIONS

After implementing fixes, test the following scenarios:

### Test User: EMPLOYEE Role
1. ✅ Can access employee portal (`/my`)
2. ✅ Can view own schedule, documents, training
3. ✅ Can clock in/out
4. ❌ Cannot access settings
5. ❌ Cannot access purchasing/PO creation
6. ❌ Cannot access financial reports
7. ❌ Cannot create/edit materials, products, customers
8. ❌ Cannot create work orders
9. ❌ Cannot create inventory holds or disposals
10. ❌ Cannot access HR data (except own records)

### Test User: SUPERVISOR Role
1. ✅ Can access most operational pages
2. ✅ Can create/edit work orders
3. ✅ Can manage team schedules
4. ❌ Cannot access financial settings
5. ❌ Cannot approve purchase orders over threshold
6. ❌ Cannot modify user permissions

### Test User: MANAGER Role
1. ✅ Can access all operational pages
2. ✅ Can access most settings
3. ✅ Can approve purchase orders
4. ✅ Can view financial reports
5. ❌ Cannot modify system-level settings (some)
6. ❌ Cannot manage permissions (read-only)

### Test User: ADMIN Role
1. ✅ Full access to everything
2. ✅ Can manage users and permissions
3. ✅ Can access all settings
4. ✅ Can override any permission

---

## 8. FILES REQUIRING MODIFICATION

### Frontend Files
1. `src/App.tsx` - Add RequireRole to all routes
2. `src/components/layout/Sidebar.tsx` - Add requiredRole to navigation items
3. All page files in `src/pages/` - Add permission checks where missing

### Database Migration Files (New Migrations Required)
1. New migration: Fix production_work_orders RLS
2. New migration: Fix receiving_lots RLS
3. New migration: Fix production_lots RLS
4. New migration: Fix pallets RLS
5. New migration: Fix inventory_holds RLS
6. New migration: Fix disposal_log RLS
7. New migration: Fix pallet_transfers RLS
8. New migration: Fix po_receiving_sessions RLS

---

## 9. CONCLUSION

The Muse ERP system has a well-designed permission framework with clear role hierarchies and a granular permission system. However, **implementation of access controls is severely incomplete**, leaving the system vulnerable to unauthorized access by EMPLOYEE-level users.

**Immediate action is required** to implement route-level protection and fix database RLS policies before deploying this system to production.

The permission system (`usePermission` hook, `role_permissions` table, RLS helper functions) is already in place and working correctly. The primary gaps are:
1. Routes not using `RequireRole` wrapper
2. Database policies using `auth.uid() IS NOT NULL` instead of role checks
3. Navigation not filtering based on roles

These gaps are fixable with systematic application of the existing security infrastructure across all routes and database tables.

---

**End of Report**
