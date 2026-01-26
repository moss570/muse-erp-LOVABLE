#!/bin/bash

# Create Lovable Export
# This script creates a clean export of the project for Lovable

EXPORT_NAME="muse-erp-lovable-export-$(date +%Y%m%d-%H%M%S).zip"

echo "Creating Lovable export..."
echo "Export file: $EXPORT_NAME"

# Create the zip file excluding unnecessary files
zip -r "$EXPORT_NAME" . \
  -x "*.git*" \
  -x "*node_modules*" \
  -x "*dist*" \
  -x "*build*" \
  -x "*.vite*" \
  -x "*.log" \
  -x ".DS_Store" \
  -x "*.zip" \
  -x "*create-lovable-export.sh"

echo ""
echo "Export created successfully: $EXPORT_NAME"
echo "File size: $(du -h "$EXPORT_NAME" | cut -f1)"
echo ""
echo "This file is ready to be uploaded to Lovable!"
