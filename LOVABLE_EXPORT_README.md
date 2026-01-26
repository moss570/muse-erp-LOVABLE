# Muse ERP - Lovable Export

## Export Information

**Export Date:** January 26, 2026
**File Name:** `muse-erp-lovable-export-20260126-120341.zip`
**File Size:** 1.9 MB

## What's Included

This export contains the complete source code for the Muse ERP system, including:

### Core Application
- ✅ All React components and pages
- ✅ TypeScript type definitions
- ✅ Context providers (Auth, Mobile Mode)
- ✅ Custom hooks and utilities
- ✅ Styling (Tailwind CSS + custom CSS)

### Configuration Files
- ✅ `package.json` - All dependencies and scripts
- ✅ `vite.config.ts` - Vite build configuration
- ✅ `tailwind.config.ts` - Tailwind CSS configuration
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `components.json` - Shadcn UI configuration

### Supabase Integration
- ✅ All Supabase Edge Functions
- ✅ Database types and client configuration
- ✅ SQL scripts for database setup

### Key Features
- Manufacturing & Production Management
- Inventory & Warehouse Management
- Sales & Customer Management
- Purchase Orders & Supplier Management
- Quality Assurance & CAPA
- Recipe & BOM Management
- Nutrition Facts & Labeling
- Xero Accounting Integration
- Employee & User Management

## What's Excluded

The following items are excluded from the export (as they should be):
- ❌ `node_modules/` - Dependencies (will be reinstalled)
- ❌ `.git/` - Git history
- ❌ `dist/` - Build artifacts
- ❌ `.env` files - Environment variables (keep these secure!)
- ❌ Log files

## How to Import to Lovable

1. **Go to Lovable.dev**
   - Log in to your Lovable account
   - Navigate to your projects dashboard

2. **Import Project**
   - Click "New Project" or "Import Project"
   - Select "Upload ZIP file"
   - Choose the export file: `muse-erp-lovable-export-20260126-120341.zip`

3. **Configure Environment Variables**
   - After import, set up your environment variables in Lovable
   - You'll need to configure:
     - Supabase URL and keys
     - Any API keys for integrations (Xero, USDA, etc.)

4. **Install Dependencies**
   - Lovable will automatically run `npm install` or `bun install`
   - All dependencies from `package.json` will be installed

5. **Deploy**
   - Once imported, Lovable will build and deploy your application
   - You can preview it in the Lovable interface

## Important Notes

### Environment Variables Required
Make sure to set up these environment variables in Lovable:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Supabase Setup
If you're setting up a new Supabase project:
1. The database schema types are included in `src/integrations/supabase/types.ts`
2. Edge Functions are in `supabase/functions/`
3. Database reset script is in `scripts/reset-database-for-golive.sql`

### Tech Stack
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 5
- **UI Library:** Shadcn UI (Radix UI primitives)
- **Styling:** Tailwind CSS
- **Backend:** Supabase (Auth, Database, Storage, Functions)
- **Router:** React Router v7
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **3D Graphics:** Three.js + React Three Fiber

## Getting Help

If you encounter any issues importing this project to Lovable:
1. Check that all required environment variables are set
2. Verify your Supabase project is properly configured
3. Contact Lovable support with the export file details

## Project Structure

```
muse-erp-LOVABLE/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utility libraries
│   ├── types/          # TypeScript types
│   └── integrations/   # Third-party integrations
├── supabase/
│   ├── functions/      # Edge Functions
│   └── ...
├── public/             # Static assets
├── docs/               # Documentation
└── [config files]      # Various configuration files
```

## Version Information

- Node.js: ^18.0.0 or ^20.0.0
- npm/bun: Latest stable
- React: 18.3.1
- TypeScript: 5.8.3
- Vite: 5.4.19

---

**Ready to import to Lovable!** 🚀
