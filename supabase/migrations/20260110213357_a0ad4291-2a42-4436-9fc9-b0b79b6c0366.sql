-- Insert default document templates for all categories

-- Purchase Order Document Template
INSERT INTO public.document_templates (name, category, template_type, description, is_default, email_subject, document_html, email_html)
VALUES (
  'Standard Purchase Order',
  'purchase',
  'email',
  'Standard purchase order document with email notification',
  true,
  'Purchase Order {{PO_NUMBER}} from {{COMPANY_NAME}}',
  '<!-- Purchase Order Document Template -->
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <!-- Header -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #1a365d; padding-bottom: 20px;">
    <div>
      <h1 style="color: #1a365d; margin: 0; font-size: 28px;">PURCHASE ORDER</h1>
      <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">PO# {{PO_NUMBER}}</p>
    </div>
    <div style="text-align: right;">
      <strong style="font-size: 18px;">{{COMPANY_NAME}}</strong><br>
      <span style="color: #666; font-size: 12px;">{{COMPANY_ADDRESS}}</span><br>
      <span style="color: #666; font-size: 12px;">{{COMPANY_PHONE}}</span>
    </div>
  </div>

  <!-- Order Details -->
  <table style="width: 100%; margin-bottom: 20px;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding-right: 20px;">
        <strong style="color: #1a365d;">VENDOR:</strong><br>
        <span style="font-size: 16px; font-weight: bold;">{{SUPPLIER_NAME}}</span><br>
        <span style="color: #666;">{{SUPPLIER_ADDRESS}}</span><br>
        <span style="color: #666;">{{SUPPLIER_EMAIL}}</span>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <strong style="color: #1a365d;">SHIP TO:</strong><br>
        <span style="font-size: 16px; font-weight: bold;">{{SHIP_TO_LOCATION}}</span><br>
        <span style="color: #666;">{{SHIP_TO_ADDRESS}}</span>
      </td>
    </tr>
  </table>

  <table style="width: 100%; margin-bottom: 20px; font-size: 13px;">
    <tr>
      <td><strong>Order Date:</strong> {{ORDER_DATE}}</td>
      <td><strong>Expected Delivery:</strong> {{EXPECTED_DELIVERY}}</td>
      <td><strong>Payment Terms:</strong> {{PAYMENT_TERMS}}</td>
    </tr>
  </table>

  <!-- Line Items -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background-color: #1a365d; color: white;">
        <th style="padding: 10px; text-align: left; border: 1px solid #1a365d;">#</th>
        <th style="padding: 10px; text-align: left; border: 1px solid #1a365d;">Item / Description</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #1a365d;">Qty</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #1a365d;">Unit</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #1a365d;">Unit Price</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #1a365d;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{LINE_ITEMS}}
    </tbody>
  </table>

  <!-- Totals -->
  <table style="width: 300px; margin-left: auto; margin-bottom: 30px;">
    <tr>
      <td style="padding: 5px;"><strong>Subtotal:</strong></td>
      <td style="padding: 5px; text-align: right;">{{SUBTOTAL}}</td>
    </tr>
    <tr>
      <td style="padding: 5px;"><strong>Shipping:</strong></td>
      <td style="padding: 5px; text-align: right;">{{SHIPPING_AMOUNT}}</td>
    </tr>
    <tr>
      <td style="padding: 5px;"><strong>Tax:</strong></td>
      <td style="padding: 5px; text-align: right;">{{TAX_AMOUNT}}</td>
    </tr>
    <tr style="background-color: #f0f0f0;">
      <td style="padding: 10px; font-size: 16px;"><strong>TOTAL:</strong></td>
      <td style="padding: 10px; text-align: right; font-size: 16px;"><strong>{{TOTAL_AMOUNT}}</strong></td>
    </tr>
  </table>

  <!-- Notes -->
  <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
    <strong>Notes:</strong><br>
    <span style="color: #666;">{{NOTES}}</span>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 11px;">
    <p>This purchase order is subject to our standard terms and conditions.</p>
    <p>{{COMPANY_NAME}} | {{COMPANY_PHONE}} | {{COMPANY_WEBSITE}}</p>
  </div>
</div>',
  '<!-- Email Template for Purchase Order -->
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #1a365d; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">Purchase Order</h1>
    <p style="margin: 10px 0 0 0;">PO# {{PO_NUMBER}}</p>
  </div>
  
  <div style="padding: 20px; background-color: #f9f9f9;">
    <p>Dear {{SUPPLIER_NAME}},</p>
    <p>Please find attached our Purchase Order <strong>{{PO_NUMBER}}</strong> dated {{ORDER_DATE}}.</p>
    
    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1a365d;">Order Summary</h3>
      <p><strong>Expected Delivery:</strong> {{EXPECTED_DELIVERY}}</p>
      <p><strong>Ship To:</strong> {{SHIP_TO_LOCATION}}</p>
      <p><strong>Total Amount:</strong> {{TOTAL_AMOUNT}}</p>
    </div>
    
    <p>Please confirm receipt of this order and the expected delivery date.</p>
    <p>If you have any questions, please contact us.</p>
    
    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>{{COMPANY_NAME}}</strong><br>
      {{COMPANY_PHONE}}<br>
      {{COMPANY_EMAIL}}
    </p>
  </div>
  
  <div style="text-align: center; padding: 15px; color: #666; font-size: 11px;">
    <p>{{COMPANY_NAME}} | {{COMPANY_ADDRESS}}</p>
  </div>
</div>'
) ON CONFLICT DO NOTHING;

-- COA Request Email Template
INSERT INTO public.document_templates (name, category, template_type, description, is_default, email_subject, email_html)
VALUES (
  'COA Request',
  'purchase',
  'email',
  'Request Certificate of Analysis from supplier',
  false,
  'COA Request for PO# {{PO_NUMBER}} - {{MATERIAL_NAME}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p>Dear {{SUPPLIER_NAME}},</p>
  
  <p>We are preparing to receive materials from Purchase Order <strong>{{PO_NUMBER}}</strong> and require the Certificate of Analysis (COA) for the following item(s):</p>
  
  <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #1a365d;">
    <strong>Material:</strong> {{MATERIAL_NAME}}<br>
    <strong>Quantity:</strong> {{QUANTITY}} {{UNIT}}<br>
    <strong>Expected Delivery:</strong> {{EXPECTED_DELIVERY}}
  </div>
  
  <p>Please send the COA documentation to this email address prior to or upon delivery.</p>
  
  <p>Thank you for your prompt attention to this matter.</p>
  
  <p style="margin-top: 30px;">
    Best regards,<br>
    <strong>{{COMPANY_NAME}}</strong><br>
    Quality Assurance Department<br>
    {{COMPANY_PHONE}}
  </p>
</div>'
) ON CONFLICT DO NOTHING;

-- Sales Invoice Template
INSERT INTO public.document_templates (name, category, template_type, description, is_default, email_subject, document_html, email_html)
VALUES (
  'Sales Invoice',
  'sale',
  'email',
  'Standard sales invoice template',
  true,
  'Invoice {{INVOICE_NUMBER}} from {{COMPANY_NAME}}',
  '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px;">
    <div>
      <h1 style="color: #2563eb; margin: 0;">INVOICE</h1>
      <p style="margin: 5px 0;">Invoice #: {{INVOICE_NUMBER}}</p>
      <p style="margin: 5px 0;">Date: {{INVOICE_DATE}}</p>
      <p style="margin: 5px 0;">Due Date: {{DUE_DATE}}</p>
    </div>
    <div style="text-align: right;">
      <strong>{{COMPANY_NAME}}</strong><br>
      {{COMPANY_ADDRESS}}<br>
      {{COMPANY_PHONE}}
    </div>
  </div>
  
  <div style="margin-bottom: 20px;">
    <strong>Bill To:</strong><br>
    {{CUSTOMER_NAME}}<br>
    {{CUSTOMER_ADDRESS}}
  </div>
  
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background-color: #2563eb; color: white;">
        <th style="padding: 10px; text-align: left;">Description</th>
        <th style="padding: 10px; text-align: center;">Qty</th>
        <th style="padding: 10px; text-align: right;">Unit Price</th>
        <th style="padding: 10px; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{LINE_ITEMS}}
    </tbody>
  </table>
  
  <table style="width: 250px; margin-left: auto;">
    <tr><td>Subtotal:</td><td style="text-align: right;">{{SUBTOTAL}}</td></tr>
    <tr><td>Tax:</td><td style="text-align: right;">{{TAX_AMOUNT}}</td></tr>
    <tr style="font-weight: bold; font-size: 16px;">
      <td style="padding-top: 10px;">Total Due:</td>
      <td style="padding-top: 10px; text-align: right;">{{TOTAL_AMOUNT}}</td>
    </tr>
  </table>
  
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
    <p>Thank you for your business!</p>
    <p>{{COMPANY_NAME}} | {{COMPANY_WEBSITE}}</p>
  </div>
</div>',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">Invoice {{INVOICE_NUMBER}}</h1>
  </div>
  <div style="padding: 20px;">
    <p>Dear {{CUSTOMER_NAME}},</p>
    <p>Please find attached your invoice for recent purchases.</p>
    <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0;">
      <p><strong>Invoice Number:</strong> {{INVOICE_NUMBER}}</p>
      <p><strong>Amount Due:</strong> {{TOTAL_AMOUNT}}</p>
      <p><strong>Due Date:</strong> {{DUE_DATE}}</p>
    </div>
    <p>If you have any questions, please contact us.</p>
    <p>Thank you for your business!</p>
    <p><strong>{{COMPANY_NAME}}</strong></p>
  </div>
</div>'
) ON CONFLICT DO NOTHING;

-- Packing List Template
INSERT INTO public.document_templates (name, category, template_type, description, is_default, document_html)
VALUES (
  'Packing List',
  'sale',
  'document',
  'Packing list for shipments',
  false,
  '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <h1 style="text-align: center; margin-bottom: 30px;">PACKING LIST</h1>
  
  <table style="width: 100%; margin-bottom: 20px;">
    <tr>
      <td style="width: 50%;">
        <strong>From:</strong><br>
        {{COMPANY_NAME}}<br>
        {{COMPANY_ADDRESS}}
      </td>
      <td style="width: 50%;">
        <strong>Ship To:</strong><br>
        {{CUSTOMER_NAME}}<br>
        {{SHIP_TO_ADDRESS}}
      </td>
    </tr>
  </table>
  
  <table style="width: 100%; margin-bottom: 20px;">
    <tr>
      <td><strong>Order #:</strong> {{ORDER_NUMBER}}</td>
      <td><strong>Ship Date:</strong> {{SHIP_DATE}}</td>
      <td><strong>Carrier:</strong> {{CARRIER_NAME}}</td>
    </tr>
  </table>
  
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background-color: #333; color: white;">
        <th style="padding: 10px; text-align: left;">Item</th>
        <th style="padding: 10px; text-align: left;">Description</th>
        <th style="padding: 10px; text-align: center;">Qty Ordered</th>
        <th style="padding: 10px; text-align: center;">Qty Shipped</th>
      </tr>
    </thead>
    <tbody>
      {{LINE_ITEMS}}
    </tbody>
  </table>
  
  <div style="margin-top: 30px;">
    <strong>Total Packages:</strong> {{TOTAL_PACKAGES}}<br>
    <strong>Total Weight:</strong> {{TOTAL_WEIGHT}}
  </div>
</div>'
) ON CONFLICT DO NOTHING;

-- Bill of Lading Template
INSERT INTO public.document_templates (name, category, template_type, description, is_default, document_html)
VALUES (
  'Bill of Lading',
  'inventory',
  'document',
  'Standard Bill of Lading document',
  true,
  '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 2px solid #000;">
  <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
    <h1 style="margin: 0;">STRAIGHT BILL OF LADING</h1>
    <p style="margin: 5px 0;">BOL #: {{BOL_NUMBER}}</p>
  </div>
  
  <table style="width: 100%; margin-bottom: 20px;">
    <tr>
      <td style="width: 50%; border: 1px solid #000; padding: 10px;">
        <strong>SHIPPER:</strong><br>
        {{COMPANY_NAME}}<br>
        {{FROM_ADDRESS}}
      </td>
      <td style="width: 50%; border: 1px solid #000; padding: 10px;">
        <strong>CONSIGNEE:</strong><br>
        {{CONSIGNEE_NAME}}<br>
        {{TO_ADDRESS}}
      </td>
    </tr>
  </table>
  
  <table style="width: 100%; margin-bottom: 20px; border: 1px solid #000;">
    <tr>
      <td style="padding: 10px; border-right: 1px solid #000;">
        <strong>Ship Date:</strong> {{SHIP_DATE}}
      </td>
      <td style="padding: 10px; border-right: 1px solid #000;">
        <strong>Carrier:</strong> {{CARRIER_NAME}}
      </td>
      <td style="padding: 10px;">
        <strong>Trailer #:</strong> {{TRAILER_NUMBER}}
      </td>
    </tr>
    <tr>
      <td style="padding: 10px; border-right: 1px solid #000; border-top: 1px solid #000;">
        <strong>Seal #:</strong> {{SEAL_NUMBER}}
      </td>
      <td style="padding: 10px; border-right: 1px solid #000; border-top: 1px solid #000;">
        <strong>Driver:</strong> {{DRIVER_NAME}}
      </td>
      <td style="padding: 10px; border-top: 1px solid #000;">
        <strong>Truck #:</strong> {{TRUCK_NUMBER}}
      </td>
    </tr>
  </table>
  
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background-color: #000; color: white;">
        <th style="padding: 8px; border: 1px solid #000;">Pallet #</th>
        <th style="padding: 8px; border: 1px solid #000;">Description</th>
        <th style="padding: 8px; border: 1px solid #000;">Cases</th>
        <th style="padding: 8px; border: 1px solid #000;">Weight</th>
      </tr>
    </thead>
    <tbody>
      {{PALLET_ITEMS}}
    </tbody>
    <tfoot>
      <tr style="font-weight: bold;">
        <td style="padding: 8px; border: 1px solid #000;">TOTAL</td>
        <td style="padding: 8px; border: 1px solid #000;"></td>
        <td style="padding: 8px; border: 1px solid #000;">{{TOTAL_CASES}}</td>
        <td style="padding: 8px; border: 1px solid #000;">{{TOTAL_WEIGHT}}</td>
      </tr>
    </tfoot>
  </table>
  
  <div style="display: flex; margin-top: 40px;">
    <div style="flex: 1; padding: 10px; border: 1px solid #000; margin-right: 10px;">
      <strong>Shipper Signature:</strong><br><br><br>
      <div style="border-top: 1px solid #000; margin-top: 30px;">Date: ____________</div>
    </div>
    <div style="flex: 1; padding: 10px; border: 1px solid #000;">
      <strong>Driver Signature:</strong><br><br><br>
      <div style="border-top: 1px solid #000; margin-top: 30px;">Date: ____________</div>
    </div>
  </div>
</div>'
) ON CONFLICT DO NOTHING;

-- Receiving Report Template
INSERT INTO public.document_templates (name, category, template_type, description, is_default, document_html)
VALUES (
  'Receiving Report',
  'inventory',
  'document',
  'Material receiving report',
  false,
  '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <h1 style="text-align: center; color: #1a365d;">RECEIVING REPORT</h1>
  
  <table style="width: 100%; margin-bottom: 20px;">
    <tr>
      <td><strong>Receiving #:</strong> {{RECEIVING_NUMBER}}</td>
      <td><strong>PO #:</strong> {{PO_NUMBER}}</td>
      <td><strong>Date:</strong> {{RECEIVED_DATE}}</td>
    </tr>
    <tr>
      <td><strong>Supplier:</strong> {{SUPPLIER_NAME}}</td>
      <td><strong>Carrier:</strong> {{CARRIER_NAME}}</td>
      <td><strong>Received By:</strong> {{RECEIVED_BY}}</td>
    </tr>
  </table>
  
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background-color: #1a365d; color: white;">
        <th style="padding: 10px; text-align: left;">Material</th>
        <th style="padding: 10px; text-align: left;">Lot #</th>
        <th style="padding: 10px; text-align: center;">Qty Ordered</th>
        <th style="padding: 10px; text-align: center;">Qty Received</th>
        <th style="padding: 10px; text-align: left;">Expiry</th>
        <th style="padding: 10px; text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      {{RECEIVING_ITEMS}}
    </tbody>
  </table>
  
  <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5;">
    <strong>Inspection Notes:</strong><br>
    {{INSPECTION_NOTES}}
  </div>
  
  <div style="margin-top: 30px;">
    <strong>Signature:</strong> ______________________ <strong>Date:</strong> ______________
  </div>
</div>'
) ON CONFLICT DO NOTHING;

-- Production Batch Record Template
INSERT INTO public.document_templates (name, category, template_type, description, is_default, document_html)
VALUES (
  'Batch Record',
  'production',
  'document',
  'Production batch record template',
  true,
  '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0;">PRODUCTION BATCH RECORD</h1>
    <h2 style="margin: 10px 0; color: #666;">{{PRODUCT_NAME}}</h2>
  </div>
  
  <table style="width: 100%; margin-bottom: 20px; border: 1px solid #ddd;">
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lot Number:</strong> {{LOT_NUMBER}}</td>
      <td style="padding: 10px; border: 1px solid #ddd;"><strong>Production Date:</strong> {{PRODUCTION_DATE}}</td>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;"><strong>Machine:</strong> {{MACHINE_NAME}}</td>
      <td style="padding: 10px; border: 1px solid #ddd;"><strong>Expiry Date:</strong> {{EXPIRY_DATE}}</td>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;"><strong>Batch Size:</strong> {{QUANTITY_PRODUCED}} {{UNIT}}</td>
      <td style="padding: 10px; border: 1px solid #ddd;"><strong>Produced By:</strong> {{PRODUCED_BY}}</td>
    </tr>
  </table>
  
  <h3>Materials Used</h3>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background-color: #333; color: white;">
        <th style="padding: 10px;">Material</th>
        <th style="padding: 10px;">Lot #</th>
        <th style="padding: 10px;">Qty Used</th>
        <th style="padding: 10px;">Verified</th>
      </tr>
    </thead>
    <tbody>
      {{MATERIALS_USED}}
    </tbody>
  </table>
  
  <h3>Quality Checks</h3>
  <div style="padding: 15px; border: 1px solid #ddd; margin-bottom: 20px;">
    {{QUALITY_CHECKS}}
  </div>
  
  <div style="margin-top: 40px; display: flex;">
    <div style="flex: 1; padding: 10px;">
      <strong>Operator:</strong><br><br>
      ____________________<br>
      Signature / Date
    </div>
    <div style="flex: 1; padding: 10px;">
      <strong>QA Approval:</strong><br><br>
      ____________________<br>
      Signature / Date
    </div>
  </div>
</div>'
) ON CONFLICT DO NOTHING;

-- Update existing label templates with proper HTML
UPDATE public.label_templates 
SET template_html = '<div style="width: 3in; height: 2in; padding: 0.1in; font-family: Arial, sans-serif; border: 1px solid #ccc; box-sizing: border-box;">
  <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">{{MATERIAL_NAME}}</div>
  <div style="font-size: 11px; color: #666; margin-bottom: 4px;">{{SUPPLIER_NAME}}</div>
  <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 6px;">
    <span>Lot: {{LOT_NUMBER}}</span>
    <span>Exp: {{EXPIRY_DATE}}</span>
  </div>
  <div style="text-align: center; margin: 8px 0;">
    <!-- Barcode placeholder -->
    <svg id="barcode-{{LOT_NUMBER}}"></svg>
  </div>
  <div style="font-size: 9px; text-align: center; color: #888;">Received: {{RECEIVED_DATE}}</div>
</div>',
fields_config = '[
  {"id": "material_name", "type": "field", "x": 5, "y": 5, "width": 90, "height": 12, "fieldKey": "material_name", "fontSize": 14, "fontWeight": "bold"},
  {"id": "supplier", "type": "field", "x": 5, "y": 20, "width": 90, "height": 10, "fieldKey": "supplier_name", "fontSize": 11},
  {"id": "lot", "type": "field", "x": 5, "y": 32, "width": 45, "height": 10, "fieldKey": "lot_number", "fontSize": 10},
  {"id": "expiry", "type": "field", "x": 50, "y": 32, "width": 45, "height": 10, "fieldKey": "expiry_date", "fontSize": 10},
  {"id": "barcode", "type": "barcode", "x": 10, "y": 45, "width": 80, "height": 25, "fieldKey": "lot_number", "barcodeType": "CODE128"},
  {"id": "received", "type": "field", "x": 5, "y": 75, "width": 90, "height": 10, "fieldKey": "received_date", "fontSize": 9, "textAlign": "center"}
]'::jsonb
WHERE label_type = 'receiving' AND label_format = '3x2';

UPDATE public.label_templates 
SET template_html = '<div style="width: 4in; height: 6in; padding: 0.15in; font-family: Arial, sans-serif; border: 1px solid #ccc; box-sizing: border-box;">
  <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px;">
    <div style="font-weight: bold; font-size: 20px;">{{PRODUCT_NAME}}</div>
    <div style="font-size: 12px; color: #666;">SKU: {{PRODUCT_SKU}}</div>
  </div>
  <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">LOT: {{LOT_NUMBER}}</div>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; margin-bottom: 15px;">
    <div><strong>Prod Date:</strong> {{PRODUCTION_DATE}}</div>
    <div><strong>Exp Date:</strong> {{EXPIRY_DATE}}</div>
    <div><strong>Machine:</strong> {{MACHINE_NAME}}</div>
    <div><strong>Batch:</strong> {{BATCH_NUMBER}}</div>
  </div>
  <div style="text-align: center; margin: 20px 0;">
    <svg id="barcode-{{LOT_NUMBER}}" style="max-width: 100%;"></svg>
  </div>
  <div style="font-size: 14px; text-align: center; margin-top: 10px;">
    <strong>Qty:</strong> {{QUANTITY}} {{UNIT}}
  </div>
</div>',
fields_config = '[
  {"id": "product", "type": "field", "x": 5, "y": 3, "width": 90, "height": 8, "fieldKey": "product_name", "fontSize": 20, "fontWeight": "bold", "textAlign": "center"},
  {"id": "sku", "type": "field", "x": 5, "y": 12, "width": 90, "height": 5, "fieldKey": "product_sku", "fontSize": 12, "textAlign": "center"},
  {"id": "lot", "type": "field", "x": 5, "y": 20, "width": 90, "height": 6, "fieldKey": "lot_number", "fontSize": 16, "fontWeight": "bold"},
  {"id": "barcode", "type": "barcode", "x": 10, "y": 50, "width": 80, "height": 20, "fieldKey": "lot_number", "barcodeType": "CODE128"},
  {"id": "qty", "type": "field", "x": 5, "y": 75, "width": 90, "height": 6, "fieldKey": "quantity", "fontSize": 14, "textAlign": "center"}
]'::jsonb
WHERE label_type = 'production' AND label_format = '4x6';

UPDATE public.label_templates 
SET template_html = '<div style="width: 4in; height: 6in; padding: 0.2in; font-family: Arial, sans-serif; border: 1px solid #000; box-sizing: border-box;">
  <div style="text-align: center; font-weight: bold; font-size: 24px; margin-bottom: 15px;">SHIPPING LABEL</div>
  <div style="border: 2px solid #000; padding: 15px; margin-bottom: 15px;">
    <div style="font-size: 12px; color: #666;">SHIP TO:</div>
    <div style="font-weight: bold; font-size: 16px;">{{CUSTOMER_NAME}}</div>
    <div style="font-size: 14px;">{{SHIP_TO_ADDRESS}}</div>
  </div>
  <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px;">
    <div style="font-size: 12px; color: #666;">FROM:</div>
    <div style="font-size: 12px;">{{COMPANY_NAME}}</div>
    <div style="font-size: 11px;">{{COMPANY_ADDRESS}}</div>
  </div>
  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px;">
    <span><strong>BOL #:</strong> {{BOL_NUMBER}}</span>
    <span><strong>Date:</strong> {{SHIP_DATE}}</span>
  </div>
  <div style="text-align: center; margin: 15px 0;">
    <svg id="barcode-{{PALLET_NUMBER}}"></svg>
  </div>
  <div style="text-align: center; font-size: 18px; font-weight: bold;">
    Pallet {{PALLET_NUMBER}} of {{TOTAL_PALLETS}}
  </div>
</div>',
fields_config = '[
  {"id": "title", "type": "text", "x": 5, "y": 3, "width": 90, "height": 8, "content": "SHIPPING LABEL", "fontSize": 24, "fontWeight": "bold", "textAlign": "center"},
  {"id": "customer", "type": "field", "x": 5, "y": 20, "width": 90, "height": 10, "fieldKey": "customer_name", "fontSize": 16, "fontWeight": "bold"},
  {"id": "address", "type": "field", "x": 5, "y": 32, "width": 90, "height": 12, "fieldKey": "ship_to_address", "fontSize": 14},
  {"id": "barcode", "type": "barcode", "x": 10, "y": 55, "width": 80, "height": 20, "fieldKey": "pallet_number", "barcodeType": "CODE128"},
  {"id": "pallet", "type": "field", "x": 5, "y": 80, "width": 90, "height": 8, "fieldKey": "pallet_number", "fontSize": 18, "fontWeight": "bold", "textAlign": "center"}
]'::jsonb
WHERE label_type = 'shipping' AND label_format = '4x6';