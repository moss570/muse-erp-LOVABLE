# Delivery Signatures Setup

## Overview

The delivery driver app includes digital signature capture for proof of delivery. Signatures are stored as base64-encoded images along with GPS coordinates and delivery notes.

## Required Package Installation

Install the signature canvas package:

```bash
npm install react-signature-canvas
npm install --save-dev @types/react-signature-canvas
```

## Features

### 1. Pending Deliveries View
- Lists all shipments ready for delivery
- Shows customer info, addresses, shipment details
- Real-time updates every 30 seconds

### 2. Signature Capture
- Touch/mouse-based signature drawing
- Clear and redraw functionality
- Base64 encoding for storage

### 3. Delivery Confirmation
- Receiver name (required)
- Digital signature (required)
- GPS location capture (optional)
- Delivery notes (optional)

### 4. GPS Tracking
- Uses browser geolocation API
- Captures latitude/longitude coordinates
- Optional but recommended for delivery verification

## Database Schema

### New Columns on `sales_shipments`
- `delivery_latitude` - GPS latitude
- `delivery_longitude` - GPS longitude
- `delivery_notes` - Driver notes about delivery
- `delivered_at` - Timestamp of delivery confirmation

### Existing Signature Columns
- `signature_data` - Base64-encoded signature image
- `signature_captured_at` - When signature was recorded
- `delivered_by_name` - Name of person who signed

## Database Function

`record_delivery_signature(p_shipment_id, p_signature_data, p_signature_name, p_latitude, p_longitude, p_delivery_notes)`

This function:
1. Updates shipment with signature and GPS data
2. Sets shipment status to 'delivered'
3. Updates order status to 'delivered' if all shipments complete
4. Records delivery timestamp

## View

`pending_deliveries` - Shows all shipments with status 'preparing' or 'in_transit' that don't have a signature yet.

## Usage

### Access the Driver App
Navigate to: `/sales/delivery-driver`

### Delivery Process
1. Driver sees list of pending deliveries
2. Taps/clicks on a delivery
3. Enters receiver name
4. Captures GPS location (optional)
5. Adds delivery notes (optional)
6. Customer signs on screen
7. Submits delivery confirmation

### Mobile Optimization
The delivery driver page is optimized for mobile/tablet use:
- Large touch targets
- Simple, focused interface
- Signature canvas sized for touch input
- Minimal text entry required

## Security Considerations

- Signatures are stored as base64 data URLs
- GPS coordinates use browser permission system
- Function uses SECURITY DEFINER for consistent access
- View only shows undelivered shipments

## Future Enhancements

- Photo capture of delivered goods
- Route optimization
- Offline mode with sync
- Signature comparison/validation
- Multi-signature support (e.g., both driver and receiver)
