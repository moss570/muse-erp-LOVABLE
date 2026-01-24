# Feature Request: Open Sales Orders Inventory Gap Analysis

## Overview
We need two related enhancements to help the production manager plan production based on unfulfilled sales orders:
1. **New Tab in Master Planning**: Show consolidated list of products on open sales orders that lack sufficient inventory
2. **Enhanced Par Levels Chart**: Add "Accounted For" column showing inventory committed to open sales orders

---

## Feature 1: Master Planning - Open Orders Shortage Tab

### Location
Add a new tab to the **Master Planning screen** (`/src/pages/manufacturing/ProductionScheduler.tsx`)

### Current Context
The Master Planning screen has multiple tabs/views:
- Grid View
- Timeline View
- Month View
- Required Capacity View
- Procurement Schedule View

### New Tab: "Open Orders Shortage" or "Production Needed"

### Purpose
Provide production manager with a prioritized list of products that need to be manufactured based on unfulfilled sales orders and current inventory shortages.

### Data Requirements

**Query Logic:**
1. Get all open sales orders with status in: `['confirmed', 'picking', 'partially_picked', 'picked', 'packing', 'packed', 'ready_to_ship', 'partially_shipped']`
2. For each sales_order_item:
   - Get `product_size_id`, `quantity_ordered`, `quantity_shipped`
   - Calculate unfulfilled quantity: `quantity_ordered - COALESCE(quantity_shipped, 0)`
3. Group by `product_size_id` to get total demand across all open orders
4. Get current available inventory from `production_lots` table:
   - Filter: `approval_status = 'Approved'` AND `quantity_available > 0`
   - Sum `quantity_available` grouped by `product_size_id`
5. Calculate shortage: `total_demand - COALESCE(available_inventory, 0)`
6. Show only items where shortage > 0

### Display Requirements

**Table Columns:**
1. **Product Name** - from `products.name` via `product_sizes.product_id`
2. **SKU** - from `product_sizes.sku`
3. **Size/Type** - from `product_sizes.size_name` and `size_type` (show "Tub" or "Case")
4. **Total Demand** - Sum of unfulfilled quantities from all open SOs
5. **Current Stock** - Available inventory from production_lots
6. **Shortage** - Demand - Stock (always > 0 in this view)
7. **Unit Type** - from `product_sizes.size_type` ("case" or "unit")
8. **Units per Case** - from `product_sizes.units_per_case` (for conversion)
9. **Production Needed** - Smart calculation:
   - If size_type = "case": Show shortage in cases
   - If size_type = "unit": Show shortage in tubs, with conversion to cases in parentheses
   - Example: "12 Tubs (3 Cases)" using units_per_case for conversion
10. **Open Order Count** - Number of distinct sales orders with this product

**Example Calculation:**
```
Product: G-MINT-08 (8oz Mint Chip)
Size: Case Pack (4 units per case)
- SO #1001: 1 case ordered, 0 shipped = 1 case needed
- SO #1002: 1 case ordered, 0 shipped = 1 case needed
- SO #1003: 1 case ordered, 0 shipped = 1 case needed
- Current Stock: 0 cases
- Result: 3 cases needed (12 tubs)
```

**Sorting/Filtering:**
- Default sort: By shortage quantity (descending) - highest priority first
- Allow sorting by: Product name, SKU, open order count, shortage
- Optional filters:
  - Product category
  - Date range (order date or requested delivery date)
  - Customer priority
  - Size type (cases vs. individual tubs)

**Visual Enhancements:**
- Color-code rows by severity:
  - Red: Shortage > 100 units or > 10 open orders
  - Amber: Shortage > 50 units or > 5 open orders
  - Standard: Everything else
- Show total summary at top:
  - "X products need production"
  - "Y total units short across Z open orders"

**Action Buttons:**
- "Create Work Order" button for each row - pre-populate work order form with:
  - Product and size selected
  - Quantity = shortage amount
  - Priority = based on earliest requested delivery date

---

## Feature 2: Enhanced Par Levels Chart in Create Work Order

### Location
Enhance the **ParLevelSummaryPanel** component (`/src/components/manufacturing/ParLevelSummaryPanel.tsx`)

### Current Display
The "INVENTORY by Part Levels" chart currently shows:
- **Current Stock** - from production_lots (Approved only)
- **Par Level** - target inventory from product_size_par_levels
- **Gap** - Par - Stock
- Status color coding (red/amber/green based on % of par)

### New Column: "Accounted For" (Open Orders)

**Add Between "Current Stock" and "Par Level":**

**New Column: "Accounted For"**
- Definition: Total quantity of this product_size_id on open (unfulfilled) sales orders
- Calculation:
  ```sql
  SELECT product_size_id, SUM(quantity_ordered - COALESCE(quantity_shipped, 0))
  FROM sales_order_items
  JOIN sales_orders ON sales_orders.id = sales_order_items.sales_order_id
  WHERE sales_orders.status IN (
    'confirmed', 'picking', 'partially_picked', 'picked',
    'packing', 'packed', 'ready_to_ship', 'partially_shipped'
  )
  GROUP BY product_size_id
  ```

**Updated Column Order:**
1. **SKU** - product_sizes.sku
2. **Current Stock** - from production_lots (existing)
3. **Accounted For** ← NEW - quantity on open sales orders
4. **Available** ← NEW - Current Stock - Accounted For (can be negative!)
5. **Par Level** - target inventory (existing)
6. **Gap** ← UPDATED - Par Level - Available (not just Par - Stock)
7. **Status** - color indicator (existing, update logic)

**Updated Gap Calculation:**
```
Available = Current Stock - Accounted For
Gap = Par Level - Available

If Available < 0: Critical shortage (already oversold)
If Available < Par Level: Below par
If Available >= Par Level: OK
```

**Visual Enhancements:**
- **Accounted For column**: Show in neutral/info color (blue) when > 0
- **Available column**:
  - Red background if negative (oversold situation)
  - Amber if < 50% of par
  - Green if >= par level
- **Updated status indicator**:
  - Red "CRITICAL": Available is negative (oversold)
  - Red: Available > 0 but < 50% of par
  - Amber: Available 50-79% of par
  - Green: Available >= par

**Tooltip on "Accounted For":**
Show breakdown on hover:
- "Committed to X open sales orders"
- "Earliest delivery: [date]"
- Link to "View Orders" (optional)

---

## Database Schema Notes

### Existing Tables (DO NOT MODIFY)
- `sales_orders` - header table with status, customer, dates
- `sales_order_items` - line items with quantity_ordered, quantity_shipped, product_size_id
- `product_sizes` - SKUs with size_type, units_per_case
- `production_lots` - current inventory with product_size_id, quantity_available, approval_status
- `product_size_par_levels` - target inventory levels

### No New Tables Required
All data exists in current schema. This is pure query/display logic.

---

## Implementation Checklist

### Part 1: Master Planning Tab
- [ ] Create new view component: `OpenOrdersShortageView.tsx` (similar to existing view components)
- [ ] Add new tab to ProductionScheduler.tsx navigation
- [ ] Create query/hook: `useOpenOrdersShortage()` to fetch shortage data
- [ ] Implement table with all required columns
- [ ] Add sorting, filtering capabilities
- [ ] Add color-coding based on severity
- [ ] Add summary statistics at top
- [ ] Add "Create Work Order" action button with pre-populated data
- [ ] Handle loading and error states
- [ ] Add responsive design for mobile

### Part 2: Par Levels Chart Enhancement
- [ ] Update ParLevelSummaryPanel.tsx component
- [ ] Create query/hook: `useOpenOrdersCommitted(productSizeIds)` to fetch accounted-for quantities
- [ ] Add "Accounted For" column to display
- [ ] Add "Available" column (calculated: Stock - Accounted For)
- [ ] Update "Gap" calculation (Par - Available instead of Par - Stock)
- [ ] Update color-coding logic for new Available calculation
- [ ] Add CRITICAL status for negative Available
- [ ] Add tooltip to "Accounted For" column showing breakdown
- [ ] Update TypeScript interfaces for new data structure
- [ ] Test with various scenarios (oversold, normal shortage, surplus)

### Part 3: Testing Scenarios
- [ ] Test with no open orders (Accounted For = 0)
- [ ] Test with open orders but sufficient stock (Available > Par)
- [ ] Test with shortage (Available < Par)
- [ ] Test with oversold situation (Stock < Accounted For, Available negative)
- [ ] Test with multiple product sizes (tubs vs cases)
- [ ] Test unit conversions (tubs to cases)
- [ ] Test with partially shipped orders (quantity_shipped > 0)
- [ ] Verify status filtering (only confirmed through partially_shipped orders)

---

## Technical Considerations

### Performance
- Consider caching the open orders shortage query (updates every 5-10 minutes acceptable)
- Use database views or materialized views if query becomes slow
- Index on sales_orders.status and sales_order_items.product_size_id

### Data Integrity
- Handle null quantity_shipped (treat as 0)
- Exclude cancelled/closed orders from calculations
- Ensure approved production_lots only in stock calculations
- Handle product_sizes with no units_per_case (show N/A)

### User Experience
- Show loading spinners during data fetch
- Show "No shortages" empty state when everything is in stock (celebrate!)
- Add refresh button to update data
- Show last updated timestamp
- Add export to CSV/Excel capability for both views

### Edge Cases
- Product with no production_lots yet (new product)
- Product with no par level set
- Order with mixed case/tub quantities
- Backorders vs. new orders (treat same)
- Partial shipments (already handled via quantity_shipped)

---

## UI/UX Mockup Suggestions

### Master Planning - Open Orders Shortage Tab
```
┌─────────────────────────────────────────────────────────────────┐
│ Master Planning                                                  │
│ [Grid] [Timeline] [Month] [Capacity] [Procurement] [★Open Orders]│
├─────────────────────────────────────────────────────────────────┤
│ 📊 Production Needed Summary                                     │
│ • 12 products need production                                    │
│ • 248 units short across 27 open orders                          │
│ • Last updated: 2 minutes ago [Refresh]              [Export]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Product         SKU              Size    Demand Stock Short Need │
│ ─────────────── ───────────────  ─────── ────── ───── ───── ──── │
│ 🔴 Mint Chip    G-MINT-08-CS4   Case     15     0     15   60T  │
│                                                         (15C)     │
│    [Create Work Order]  [View Orders: 3]                         │
│                                                                   │
│ 🟡 Vanilla Bean V-VAN-16-CS6    Case     8      2     6    36T  │
│                                                         (6C)      │
│    [Create Work Order]  [View Orders: 5]                         │
│                                                                   │
│ ⚪ Strawberry   S-STRW-08-TUB   Tub      45     20    25   25T  │
│                                                         (6.25C)   │
│    [Create Work Order]  [View Orders: 2]                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Par Levels Chart - Enhanced
```
┌─────────────────────────────────────────────────────────────────┐
│ INVENTORY by Part Levels                      ⚠️ 3 SKUs below par│
├─────────────────────────────────────────────────────────────────┤
│ Individual Tubs                                                  │
│                                                                   │
│ SKU          Stock  Accounted  Available  Par  Gap  Status       │
│ ──────────── ─────  ─────────  ─────────  ───  ───  ──────       │
│ G-MINT-08    50     45 ⓘ       5         100  95   🔴 Critical  │
│ V-VAN-16     120    30 ⓘ       90        100  10   🟡 Low       │
│ S-STRW-08    150    20 ⓘ       130       100  -30  🟢 OK        │
│                                                                   │
│ Case Packs                                                       │
│                                                                   │
│ SKU          Stock  Accounted  Available  Par  Gap  Status       │
│ ──────────── ─────  ─────────  ─────────  ───  ───  ──────       │
│ G-MINT-08-CS 10     12 ⓘ       -2        20   22   🔴 OVERSOLD  │
│ V-VAN-16-CS  25     5 ⓘ        20        20   0    🟢 OK        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

ⓘ Tooltip on hover:
   "Committed to 3 open sales orders"
   "Earliest delivery: Jan 28, 2026"
   [View Orders →]
```

---

## Success Criteria

### Feature 1: Open Orders Shortage Tab
✅ Production manager can see at a glance which products need to be made
✅ Quantities are accurate, accounting for partially shipped orders
✅ Unit conversions (tubs to cases) are correct using units_per_case
✅ Can sort and prioritize by various criteria
✅ Can create work orders directly from the shortage list
✅ Updates when sales orders or inventory changes

### Feature 2: Enhanced Par Levels Chart
✅ "Accounted For" column accurately shows open order commitments
✅ "Available" calculation correctly shows real available inventory
✅ Gap calculation uses Available (not just Stock) vs Par Level
✅ CRITICAL status appears for oversold situations (negative Available)
✅ Color coding helps quickly identify problems
✅ Works for both tub and case sections
✅ Integrates seamlessly with existing work order creation flow

---

## Questions for Clarification

1. **Order Priority**: Should we factor in requested_delivery_date or customer priority when sorting the shortage list? Or just raw quantity?

2. **Partial Shipments**: Currently we calculate `quantity_ordered - quantity_shipped`. Should we also consider `quantity_picked` or `quantity_packed` as "accounted for" even if not yet shipped?

3. **Work Order Auto-Creation**: Should the "Create Work Order" button fully create the WO, or open the dialog pre-populated for review?

4. **Status Inclusion**: We include orders from "confirmed" through "partially_shipped". Should we also include "draft" orders, or only confirmed orders?

5. **Historical Data**: Should the Open Orders Shortage tab show only current shortages, or also track historical shortage trends over time?

6. **Notifications**: Should there be alerts/notifications when a product goes into oversold status (Available becomes negative)?

7. **Production Stages**: Should we consider WIP inventory (production_lots in non-final stages) as "coming soon" stock?

8. **Multi-Location**: Do we need to filter by warehouse_location_id for 3PL orders, or show aggregate across all locations?

---

## File References

**Files to Modify:**
1. `/src/pages/manufacturing/ProductionScheduler.tsx` - Add new tab
2. `/src/components/manufacturing/ParLevelSummaryPanel.tsx` - Enhance chart
3. Create new: `/src/components/manufacturing/OpenOrdersShortageView.tsx`
4. Create new: `/src/hooks/useOpenOrdersShortage.ts`
5. Create new: `/src/hooks/useOpenOrdersCommitted.ts`

**Related Files (Context):**
- `/src/pages/sales/Orders.tsx` - Sales orders display
- `/src/pages/sales/OrderFulfillmentReports.tsx` - Backorder reports
- `/src/hooks/useInventory.ts` - Inventory queries
- `/src/hooks/useProductSizeParLevels.ts` - Par level queries

**Database Tables:**
- `sales_orders` - Order headers
- `sales_order_items` - Order line items
- `product_sizes` - SKU definitions
- `production_lots` - Current inventory
- `product_size_par_levels` - Target inventory

---

## Implementation Priority

**Phase 1 (High Priority):**
1. Implement Open Orders Shortage Tab - Core production planning need
2. Basic table with all required columns
3. Shortage calculation logic
4. Unit conversions (tubs to cases)

**Phase 2 (Medium Priority):**
1. Enhance Par Levels Chart with Accounted For column
2. Update Available and Gap calculations
3. CRITICAL status for oversold
4. Improved color coding

**Phase 3 (Nice to Have):**
1. Create Work Order integration
2. Advanced filtering and sorting
3. Export capabilities
4. Tooltips and detailed breakdowns
5. Performance optimizations

---

## Notes

- This feature bridges the gap between sales and production planning
- Helps prevent stockouts and customer delivery delays
- Provides visibility into real available inventory vs. committed inventory
- Enables proactive production scheduling based on actual demand
- The "Accounted For" concept is critical - it shows inventory that's already spoken for

**Key Business Logic:**
```
Current Stock = What we physically have (production_lots approved)
Accounted For = What's promised to customers (open sales orders)
Available = What we can actually use (Stock - Accounted For)
Par Level = What we should have (target)
Gap = What we need to make (Par - Available)
```

When Available is negative, we're in an **oversold** situation - we've promised more than we have!
