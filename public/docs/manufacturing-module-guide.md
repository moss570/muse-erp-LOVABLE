# Manufacturing Module User Guide
## Complete End-to-End Production Workflow

---

## Table of Contents

1. [Overview](#overview)
2. [System Prerequisites](#system-prerequisites)
3. [Workflow Summary](#workflow-summary)
4. [Phase 1: Purchasing Raw Materials](#phase-1-purchasing-raw-materials)
5. [Phase 2: Receiving & QA Inspection](#phase-2-receiving--qa-inspection)
6. [Phase 3: Production Setup](#phase-3-production-setup)
7. [Phase 4: Shop Floor Execution](#phase-4-shop-floor-execution)
8. [Phase 5: Case Packing & Finished Goods](#phase-5-case-packing--finished-goods)
9. [Recipe & BOM Management](#recipe--bom-management)
10. [Work Orders](#work-orders)
11. [Cost Tracking & Analysis](#cost-tracking--analysis)
12. [Lot Traceability](#lot-traceability)
13. [Troubleshooting](#troubleshooting)

---

## Overview

The Manufacturing Module provides a complete end-to-end production management system for ice cream and food manufacturing operations. It integrates purchasing, receiving, production, and inventory management into a unified workflow with full lot traceability.

### Key Features

- **Multi-stage Production**: Support for Base Preparation, Flavoring, Freezing, and Packaging stages
- **Dual Work Order System**: Simple production work orders and detailed cost-tracking work orders
- **Recipe & BOM Management**: Version-controlled recipes with automatic cost calculation
- **Shop Floor Interface**: Mobile-friendly tablet interface for production workers
- **Real-time Cost Tracking**: Planned vs. actual cost variance analysis
- **Full Lot Genealogy**: Forward and backward traceability across all production stages

---

## System Prerequisites

Before starting production, ensure the following are configured:

### Master Data Setup

1. **Materials** (Settings → Materials)
   - Raw ingredients (milk, cream, sugar, flavors, stabilizers)
   - Packaging materials (tubs, lids, boxes)
   - All materials must have approval_status = "approved"

2. **Products** (Inventory → Products)
   - Finished goods definitions with SKUs
   - Unit of measure and case pack configurations
   - Base products (if using multi-stage production)

3. **Production Lines** (Settings → Production Lines)
   - Configure your production equipment (Mixing, Freezing, etc.)
   - Set capacity and changeover times

4. **Production Stages** (Settings → Production Stages)
   - Define your production workflow stages:
     - BASE_PREP: Base Preparation
     - FLAVOR: Flavoring
     - FREEZE: Freezing & Tubbing
     - HARDEN: Hardening
     - PACKAGE: Final Packaging
     - QC_FINAL: Final QC

5. **Suppliers** (Purchasing → Suppliers)
   - All raw material suppliers
   - Supplier compliance documentation

6. **Locations** (Settings → Locations)
   - Receiving Dock
   - Raw Material Storage (Cold/Dry)
   - Production Floor
   - Freezer Storage
   - Shipping Dock

---

## Workflow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         END-TO-END PRODUCTION FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. PURCHASING          2. RECEIVING           3. PRODUCTION SETUP         │
│  ┌─────────────┐       ┌─────────────┐        ┌─────────────┐              │
│  │ Create PO   │──────▶│ Receive     │───────▶│ Create      │              │
│  │ for Raw     │       │ Materials   │        │ Work Order  │              │
│  │ Materials   │       │ + QA Check  │        │             │              │
│  └─────────────┘       └─────────────┘        └─────────────┘              │
│                               │                      │                      │
│                               ▼                      ▼                      │
│                        ┌─────────────┐        ┌─────────────┐              │
│                        │ Putaway to  │        │ Issue to    │              │
│                        │ Storage     │        │ Production  │              │
│                        └─────────────┘        └─────────────┘              │
│                                                      │                      │
│  ┌──────────────────────────────────────────────────┘                      │
│  ▼                                                                          │
│  4. SHOP FLOOR EXECUTION                                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ BASE PREP   │───▶│ FLAVORING   │───▶│ FREEZING &  │───▶│ HARDENING   │  │
│  │ - Weigh     │    │ - Add       │    │ TUBBING     │    │ - Cold      │  │
│  │ - Mix       │    │   Flavor    │    │ - Freeze    │    │   Storage   │  │
│  │ - Pasteurize│    │ - Color     │    │ - Package   │    │             │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                  │          │
│  5. CASE PACKING & FINISHED GOODS                               ▼          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ FINAL       │◀───│ FINAL QC    │◀───│ CASE PACK   │◀───│ LABELING    │  │
│  │ INVENTORY   │    │ - Sample    │    │ - Box       │    │ - Print     │  │
│  │ - Allocate  │    │ - Approve   │    │ - Palletize │    │ - Apply     │  │
│  │ - Ship      │    │             │    │             │    │             │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Purchasing Raw Materials

### Creating a Purchase Order

1. Navigate to **Purchasing → Purchase Orders**
2. Click **Create Purchase Order**
3. Fill in the PO details:
   - **Supplier**: Select from approved suppliers
   - **Expected Delivery Date**: When materials should arrive
   - **Delivery Location**: Usually "Receiving Dock"
   - **Ship Via**: Carrier information

4. Add Line Items:
   - Select materials from the supplier's linked materials
   - Enter quantity and unit price
   - System calculates line totals automatically

5. Save the PO as **Draft** or submit for **Approval**

### PO Approval Workflow

```
Draft → Approved → Sent → Partially Received → Received
```

- **Draft**: Initial creation, can be edited freely
- **Approved**: Ready to send to supplier
- **Sent**: Communicated to supplier (email or mark as sent)
- **Received**: All materials have been received

### Example Purchase Order

| Material | Quantity | UOM | Unit Price | Total |
|----------|----------|-----|------------|-------|
| Milk | 500 | 5GAL | $66.50 | $33,250.00 |
| Heavy Cream | 200 | 5GAL | $85.00 | $17,000.00 |
| Sugar | 100 | BAG-50LB | $45.00 | $4,500.00 |
| Vanilla Flavor | 20 | GAL | $125.00 | $2,500.00 |

---

## Phase 2: Receiving & QA Inspection

### Starting a Receiving Session

1. Navigate to **Purchasing → Receiving**
2. Find the PO that's being delivered
3. Click **Start Receiving**
4. Enter session details:
   - Truck/Trailer number
   - BOL (Bill of Lading) number
   - Driver name
   - Delivery temperature (if applicable)

### Receiving Line Items

For each material received:

1. **Scan or Select** the PO line item
2. Enter receiving details:
   - **Quantity Received**: May differ from PO quantity
   - **Supplier Lot Number**: From supplier's packaging
   - **Expiry Date**: Per supplier label
   - **Receiving Temperature**: For temperature-sensitive items
3. System generates **Internal Lot Number** (format: MAT-YYYYMMDD-XXX)
4. Record any **condition notes** (damaged packaging, etc.)

### QA 2nd Inspection

After receiving, QA must complete inspection:

1. Navigate to **QA → Receiving Inspections**
2. Find the lot awaiting QA review
3. Complete the inspection checklist:
   - ☑ Lot codes verified and readable
   - ☑ Quantity matches receiving documents
   - ☑ Packaging intact, no damage
   - ☑ Temperature within acceptable range
   - ☑ No signs of contamination
4. Upload any required documents (COA)
5. **Approve** or **Reject** the lot
6. Sign with digital signature

### Putaway

After QA approval:

1. Navigate to **Warehouse → Putaway**
2. Find the approved lot
3. Scan the destination location barcode
4. Confirm putaway completion
5. Lot is now available for production

---

## Phase 3: Production Setup

### Creating Recipes

1. Navigate to **Manufacturing → Recipes**
2. Click **Create Recipe**
3. Fill in recipe header:
   - **Recipe Code**: Unique identifier (e.g., RCP-VAN-001)
   - **Recipe Name**: Descriptive name
   - **Version**: Start with 1.0
   - **Product**: Link to finished product
   - **Batch Size**: Standard batch quantity
   - **Standard Labor Hours**: Estimated production time

4. Add BOM (Bill of Materials) items:
   - Select material from approved materials
   - Enter quantity required per batch
   - Set wastage percentage (if applicable)
   - Assign to production stage

5. Set recipe to **Approved** status when ready for production

### Example Recipe: Vanilla Ice Cream

**Header:**
- Recipe Code: RCP-VAN-001
- Batch Size: 100 GAL
- Standard Labor Hours: 4.0
- Standard Machine Hours: 2.0

**BOM:**
| Material | Qty/Batch | UOM | Stage |
|----------|-----------|-----|-------|
| Milk | 60 | GAL | BASE_PREP |
| Heavy Cream | 25 | GAL | BASE_PREP |
| Sugar | 40 | LB | BASE_PREP |
| Stabilizer | 2 | LB | BASE_PREP |
| Vanilla Flavor | 1 | GAL | FLAVOR |

### Creating Work Orders

**Option 1: Production Work Orders (Simple)**

1. Navigate to **Manufacturing → Work Orders**
2. Click **Create Work Order**
3. Select:
   - Product to produce
   - Quantity target
   - Scheduled date
   - Production line/machine
4. Work order number auto-generated (WO-B-YYMMDD-XXX)

**Option 2: Detailed Work Orders (Cost Tracking)**

For detailed cost tracking:

1. Navigate to **Manufacturing → Work Orders**
2. Create with full details:
   - Link to Recipe
   - Planned material/labor/overhead costs
   - Labor rate per hour
   - Overhead allocation method

### Work Order Status Flow

```
Created → Released → In Progress → Completed → Closed
                         ↓
                    [QA Hold] (if needed)
```

---

## Phase 4: Shop Floor Execution

### Accessing Shop Floor Interface

1. Navigate to **Manufacturing → Shop Floor**
2. View available work orders by status
3. The interface is optimized for tablets

### Clocking Into a Work Order

1. Find your assigned work order
2. Click **Clock In**
3. System records:
   - Employee ID
   - Clock-in timestamp
   - Work order association
4. Status badge shows "WORKING"

### Executing Production Stages

**Stage 1: Base Preparation**

1. Navigate to **Manufacturing → Base Production** (or select from Work Order)
2. Select:
   - Product to produce
   - Recipe to use
   - Production line/machine
   - Batch multiplier (1x = standard batch)

3. Click **Start Production Run**

4. **Ingredient Weighing**:
   - System displays each BOM item
   - Weigh each ingredient precisely
   - Scan or select source lot (FEFO order)
   - Enter actual weight
   - Mark each item as complete

5. **Allergen Acknowledgment**:
   - If recipe contains allergens, acknowledgment dialog appears
   - Review allergens present
   - Confirm acknowledgment

6. **Complete Base Stage**:
   - Enter production notes
   - Record labor hours
   - Click **Finish Production**
   - System creates intermediate lot

**Stage 2: Flavoring**

1. Navigate to **Manufacturing → Finishing Production**
2. Select "Flavoring" tab
3. Select source lot (from Base stage)
4. Add flavor ingredients per recipe
5. Complete stage

**Stage 3: Freezing & Tubbing**

1. Select "Freezing" tab
2. Select source lot (from Flavoring)
3. Record freezer settings
4. Package into containers
5. Record actual quantities produced
6. Complete stage

**Stage 4: Case Packing**

1. Select "Case Pack" tab
2. Select finished tubs/containers
3. Pack into cases per product configuration
4. Print case labels
5. Palletize and label pallets
6. Complete stage

### Clocking Out

1. Return to Shop Floor main page
2. Click **Clock Out**
3. System calculates:
   - Hours worked
   - Labor cost
   - Updates work order actual costs

---

## Phase 5: Case Packing & Finished Goods

### Completing Production

After all production stages:

1. **Final QC Review**:
   - QA samples finished product
   - Runs required quality tests
   - Approves lot for release

2. **Create Finished Goods Lot**:
   - System generates FG lot number
   - Links to all parent lots (traceability)
   - Records actual costs

3. **Inventory Allocation**:
   - Product available in FG inventory
   - Ready for order fulfillment

### Pallet Building

1. Navigate to **Warehouse → Pallet Building**
2. Create new pallet
3. Scan/select cases to add
4. Print pallet label
5. Move to shipping dock or 3PL transfer

---

## Recipe & BOM Management

### Recipe Versioning

- Recipes support version control (1.0, 1.1, 2.0, etc.)
- Only one version can be "Active" at a time
- Archive old versions, don't delete

### Cost Calculation

Click **Recalculate Cost** on any recipe to update:

1. **Material Cost**: Sum of (BOM Qty × Material Unit Cost)
2. **Labor Cost**: Standard Hours × Labor Rate
3. **Overhead Cost**: Based on allocation method
4. **Total Cost/Batch**: Sum of all costs
5. **Cost/Unit**: Total Cost ÷ Batch Size

### Recipe Approval Workflow

```
Draft → Pending Review → Approved → [Archived]
```

- **Draft**: Under development
- **Pending Review**: Submitted for QA review
- **Approved**: Ready for production use
- **Archived**: No longer active

---

## Work Orders

### Work Order Types

| Type | Description |
|------|-------------|
| Make-to-Stock | Standard production for inventory |
| Make-to-Order | Customer-specific production |
| Rework | Reprocessing of failed batches |
| R&D Sample | Trial batches for development |

### Priority Levels

| Level | Description |
|-------|-------------|
| Rush | Highest priority, due ASAP |
| High | Expedited, due within 24-48 hours |
| Standard | Normal scheduling |
| Low | Flexible timing |

### Cost Variance Tracking

Work orders track planned vs. actual costs:

| Cost Type | Planned | Actual | Variance |
|-----------|---------|--------|----------|
| Materials | $500.00 | $485.00 | -$15.00 ✓ |
| Labor | $160.00 | $175.00 | +$15.00 ⚠ |
| Overhead | $50.00 | $52.00 | +$2.00 |
| **Total** | $710.00 | $712.00 | +$2.00 |

---

## Cost Tracking & Analysis

### Cost Components

1. **Material Cost**:
   - Based on actual lots consumed
   - Uses landed cost from receiving

2. **Labor Cost**:
   - Clock in/out time tracking
   - Hourly rate × hours worked

3. **Overhead Cost**:
   - Allocated per production run
   - Methods: Labor Hours, Machine Hours, Units Produced, Fixed Amount

### Cost Reports

View cost analysis at:
- Individual work order level
- Recipe level (historical averages)
- Product level (unit cost trends)

---

## Lot Traceability

### Lot Number Formats

| Type | Format | Example |
|------|--------|---------|
| Material Lot | MAT-YYYYMMDD-XXX | MAT-20260120-001 |
| Production Lot | YY-JJJ-MMBB | 26-020-0101 |

### Forward Traceability

"Where did this material go?"

1. Navigate to **Quality → Lot Traceability**
2. Enter raw material lot number
3. View all production lots that used this material
4. Track through all manufacturing stages

### Backward Traceability

"What went into this product?"

1. Enter finished goods lot number
2. View all component lots and their suppliers
3. Essential for recall management

### Genealogy Tree

The system maintains parent-child relationships:

```
Finished Product (26-020-0101)
├── Flavored Mix (26-019-0501)
│   ├── Base Mix (26-018-0201)
│   │   ├── Milk (MAT-20260110-001)
│   │   ├── Cream (MAT-20260110-002)
│   │   └── Sugar (MAT-20260112-003)
│   └── Vanilla (MAT-20260115-001)
└── Tubs (MAT-20260118-005)
```

---

## Troubleshooting

### Common Issues

**Issue: Can't start production - materials not available**
- Check QA approval status of receiving lots
- Verify putaway has been completed
- Confirm inventory location

**Issue: Work order costs not calculating**
- Ensure recipe has BOM items with costs
- Verify materials have unit costs assigned
- Run "Recalculate Cost" on the recipe

**Issue: Lot not appearing in FEFO list**
- Check lot status is "available"
- Verify lot is not on hold
- Confirm QA has approved the lot

**Issue: Clock out not working**
- Ensure you're clocked into a work order
- Check internet connectivity
- Contact IT if persistent

### Support Contacts

For system issues:
- IT Help Desk: ext. 5000
- Quality Manager: ext. 5100
- Production Manager: ext. 5200

---

## Quick Reference Card

### Navigation Shortcuts

| Function | Path |
|----------|------|
| Create PO | Purchasing → Purchase Orders → Create |
| Receive Materials | Purchasing → Receiving |
| Start Production | Manufacturing → Base Production |
| Shop Floor | Manufacturing → Shop Floor |
| View Recipes | Manufacturing → Recipes |
| Work Orders | Manufacturing → Work Orders |
| Lot Trace | Quality → Lot Traceability |

### Key Status Colors

| Color | Meaning |
|-------|---------|
| 🟢 Green | Approved / Available / Complete |
| 🟡 Yellow | Pending / In Progress / Warning |
| 🔴 Red | Rejected / On Hold / Overdue |
| ⚪ Gray | Draft / Inactive |

### Production Stage Codes

| Code | Stage Name |
|------|------------|
| BASE_PREP | Base Preparation |
| FLAVOR | Flavoring |
| FREEZE | Freezing & Tubbing |
| HARDEN | Hardening |
| PACKAGE | Final Packaging |
| QC_FINAL | Final QC |

---

*Document Version: 1.0*
*Last Updated: January 2026*
*For Manufacturing Module v1.0*
