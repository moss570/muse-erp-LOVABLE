# POLICY & SOP MANAGEMENT SYSTEM - SETTINGS HUB

## **OVERVIEW**

The Settings Hub is the centralized administrative control center for the entire Policy & SOP Management System. This is where managers and admins configure, upload, and manage all system settings.

**Access Level:** Manager, Admin, Quality Director
**Location:** `/policies/settings`

---

## **1. SETTINGS HUB MAIN PAGE**

### **1.1 Layout & Navigation**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Policies              Policy & SOP Settings                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────┐  ┌───────────────────────────────────────────────┐   │
│  │  QUICK LINKS     │  │                                                │   │
│  │                  │  │  Welcome to Policy & SOP Settings              │   │
│  │  • SQF Codes     │  │  ─────────────────────────────────────────    │   │
│  │  • Categories    │  │                                                │   │
│  │  • Policy Types  │  │  Configure and manage your Policy & SOP        │   │
│  │  • Tags          │  │  Management System from this central hub.      │   │
│  │  • Training      │  │                                                │   │
│  │  • Approval      │  │  ┌──────────────────────────────────────────┐ │   │
│  │  • Numbering     │  │  │ 📊 System Status                         │ │   │
│  │  • Permissions   │  │  │                                          │ │   │
│  │  • Integration   │  │  │ Active Policies: 88                      │ │   │
│  │                  │  │  │ Active SQF Edition: Edition 9.1          │ │   │
│  └──────────────────┘  │  │ Training Compliance: 87%                 │ │   │
│                        │  │ Pending Approvals: 5                     │ │   │
│                        │  └──────────────────────────────────────────┘ │   │
│                        │                                                │   │
│                        └────────────────────────────────────────────────┘   │
│                                                                               │
│  SETTINGS CATEGORIES                                                         │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🏛️  REGULATORY & COMPLIANCE                                          │   │
│  │                                                                       │   │
│  │  ┌────────────────────┐  ┌────────────────────┐                     │   │
│  │  │ 📋 SQF Codes       │  │ 🔄 HACCP Settings  │                     │   │
│  │  │                    │  │                    │                     │   │
│  │  │ Upload and manage  │  │ Configure HACCP    │                     │   │
│  │  │ SQF code editions  │  │ plan templates and │                     │   │
│  │  │                    │  │ verification rules │                     │   │
│  │  │ Current: Ed. 9.1   │  │                    │                     │   │
│  │  │ 245 codes active   │  │ 12 active plans    │                     │   │
│  │  │                    │  │                    │                     │   │
│  │  │ [Manage →]         │  │ [Configure →]      │                     │   │
│  │  └────────────────────┘  └────────────────────┘                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📚 DOCUMENT ORGANIZATION                                             │   │
│  │                                                                       │   │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────┐  │   │
│  │  │ 📁 Categories      │  │ 📄 Policy Types    │  │ 🏷️  Tags      │  │   │
│  │  │                    │  │                    │  │              │  │   │
│  │  │ Food Safety        │  │ SOP, Policy, WI    │  │ Manage tags  │  │   │
│  │  │ Quality Assurance  │  │ HACCP, Forms       │  │ for policies │  │   │
│  │  │ GMP, Training...   │  │ Emergency Proc.    │  │              │  │   │
│  │  │                    │  │                    │  │              │  │   │
│  │  │ 13 categories      │  │ 7 types            │  │ 45 tags      │  │   │
│  │  │                    │  │                    │  │              │  │   │
│  │  │ [Manage →]         │  │ [Manage →]         │  │ [Manage →]   │  │   │
│  │  └────────────────────┘  └────────────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🎓 TRAINING & COMPLIANCE                                             │   │
│  │                                                                       │   │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────┐  │   │
│  │  │ 📖 Training Config │  │ 📊 Quiz Templates  │  │ 📜 Certs     │  │   │
│  │  │                    │  │                    │  │              │  │   │
│  │  │ Default settings   │  │ Create reusable    │  │ Certificate  │  │   │
│  │  │ for training       │  │ quiz templates     │  │ templates    │  │   │
│  │  │ requirements       │  │                    │  │              │  │   │
│  │  │                    │  │                    │  │              │  │   │
│  │  │ [Configure →]      │  │ [Manage →]         │  │ [Manage →]   │  │   │
│  │  └────────────────────┘  └────────────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ⚙️  WORKFLOW & AUTOMATION                                            │   │
│  │                                                                       │   │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────┐  │   │
│  │  │ ✅ Approval        │  │ 🔢 Numbering       │  │ 🔔 Alerts    │  │   │
│  │  │                    │  │                    │  │              │  │   │
│  │  │ Configure approval │  │ Policy numbering   │  │ Notification │  │   │
│  │  │ workflows and      │  │ schemes and        │  │ settings     │  │   │
│  │  │ review processes   │  │ auto-generation    │  │              │  │   │
│  │  │                    │  │                    │  │              │  │   │
│  │  │ [Configure →]      │  │ [Configure →]      │  │ [Configure →]│  │   │
│  │  └────────────────────┘  └────────────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🔐 SECURITY & ACCESS                                                 │   │
│  │                                                                       │   │
│  │  ┌────────────────────┐  ┌────────────────────┐                     │   │
│  │  │ 👥 Permissions     │  │ 📝 Audit Logs      │                     │   │
│  │  │                    │  │                    │                     │   │
│  │  │ Role-based access  │  │ View system        │                     │   │
│  │  │ control settings   │  │ activity logs      │                     │   │
│  │  │                    │  │                    │                     │   │
│  │  │ [Manage →]         │  │ [View →]           │                     │   │
│  │  └────────────────────┘  └────────────────────┘                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🔗 INTEGRATION                                                       │   │
│  │                                                                       │   │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────┐  │   │
│  │  │ 🏭 Manufacturing   │  │ 👥 HR Integration  │  │ 📤 Export    │  │   │
│  │  │                    │  │                    │  │              │  │   │
│  │  │ Link policies to   │  │ Training record    │  │ Export/import│  │   │
│  │  │ production steps   │  │ sync settings      │  │ settings     │  │   │
│  │  │                    │  │                    │  │              │  │   │
│  │  │ [Configure →]      │  │ [Configure →]      │  │ [Configure →]│  │   │
│  │  └────────────────────┘  └────────────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## **2. SQF CODE MANAGEMENT**

### **2.1 SQF Codes Settings Page**

**Route:** `/policies/settings/sqf-codes`

```tsx
function SQFCodeSettings() {
  const { data: editions } = useSQFEditions();
  const { data: activeEdition } = useActiveSQFEdition();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SQF Code Management</h1>
          <p className="text-gray-600">Upload and manage SQF code editions</p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload New Edition
        </Button>
      </div>

      {/* Active Edition Banner */}
      {activeEdition && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900">
                    Active Edition: {activeEdition.edition_name}
                  </h3>
                  <p className="text-sm text-green-700">
                    {activeEdition.total_codes_extracted} codes •
                    Released {format(activeEdition.release_date, 'PP')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Button variant="outline" asChild>
                  <Link to={`/policies/settings/sqf-codes/${activeEdition.id}`}>
                    View Codes
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          label="Total Editions"
          value={editions?.length || 0}
          icon={<FileText />}
        />
        <StatsCard
          label="Active Codes"
          value={activeEdition?.total_codes_extracted || 0}
          icon={<CheckCircle />}
          variant="success"
        />
        <StatsCard
          label="Policies Mapped"
          value={activeEdition?.policies_mapped_count || 0}
          icon={<Link2 />}
        />
        <StatsCard
          label="Compliance %"
          value={`${activeEdition?.compliance_percentage || 0}%`}
          icon={<Award />}
        />
      </div>

      {/* All Editions */}
      <Card>
        <CardHeader>
          <CardTitle>All SQF Editions</CardTitle>
          <CardDescription>
            Manage different versions of SQF code requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {editions?.map(edition => (
              <SQFEditionRow key={edition.id} edition={edition} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <SQFUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
    </div>
  );
}

function SQFEditionRow({ edition }) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{edition.edition_name}</h3>
            <Badge variant={edition.is_active ? 'default' : 'outline'}>
              {edition.is_active ? 'Active' : edition.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">
            Released {format(edition.release_date, 'PP')} •
            {edition.total_codes_extracted} codes
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/policies/settings/sqf-codes/${edition.id}`}>
            View Codes
          </Link>
        </Button>

        {!edition.is_active && edition.parsing_status === 'Completed' && (
          <Button variant="outline" size="sm" onClick={() => activateEdition(edition.id)}>
            Set Active
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => exportEdition(edition.id)}>
              Export Codes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => viewMappings(edition.id)}>
              View Policy Mappings
            </DropdownMenuItem>
            {edition.parsing_status === 'Failed' && (
              <DropdownMenuItem onClick={() => retryParsing(edition.id)}>
                Retry AI Parsing
              </DropdownMenuItem>
            )}
            {!edition.is_active && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => deleteEdition(edition.id)} className="text-red-600">
                  Delete Edition
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
```

### **2.2 SQF Edition Detail Page**

**Route:** `/policies/settings/sqf-codes/:editionId`

```tsx
function SQFEditionDetail({ editionId }) {
  const { data: edition } = useSQFEdition(editionId);
  const { data: codes } = useSQFCodes(editionId);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{edition.edition_name}</h1>
            <Badge variant={edition.is_active ? 'default' : 'outline'}>
              {edition.is_active ? 'Active' : edition.status}
            </Badge>
          </div>
          <p className="text-gray-600">
            Released {format(edition.release_date, 'PP')} •
            {edition.total_codes_extracted} codes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportCodes()}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setAddCodeDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Code Manually
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={!selectedCategory ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All ({codes?.length})
        </Button>
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat} ({codes?.filter(c => c.category === cat).length})
          </Button>
        ))}
      </div>

      {/* Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>SQF Code Library</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Search codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                header: 'Code',
                accessor: 'code_number',
                cell: (row) => (
                  <div className="font-mono font-semibold">{row.code_number}</div>
                )
              },
              {
                header: 'Title',
                accessor: 'title',
                cell: (row) => (
                  <div>
                    <div className="font-medium">{row.title}</div>
                    {row.is_fundamental && (
                      <Badge variant="destructive" className="mt-1">Fundamental</Badge>
                    )}
                  </div>
                )
              },
              {
                header: 'Category',
                accessor: 'category',
                cell: (row) => (
                  <Badge variant="outline">{row.category}</Badge>
                )
              },
              {
                header: 'Policies Mapped',
                accessor: 'policies_mapped_count',
                cell: (row) => (
                  <div className="text-center">
                    {row.policies_mapped_count || 0}
                  </div>
                )
              },
              {
                header: 'Compliance',
                accessor: 'compliance_status',
                cell: (row) => (
                  <Badge variant={getComplianceVariant(row.compliance_status)}>
                    {row.compliance_status}
                  </Badge>
                )
              },
              {
                header: 'Actions',
                cell: (row) => (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => viewCode(row.id)}>
                      View
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => editCode(row.id)}>
                      Edit
                    </Button>
                  </div>
                )
              }
            ]}
            data={filteredCodes}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## **3. CATEGORY MANAGEMENT**

### **3.1 Categories Settings Page**

**Route:** `/policies/settings/categories`

```tsx
function CategorySettings() {
  const { data: categories } = usePolicyCategories();
  const [editingCategory, setEditingCategory] = useState<any>(null);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Policy Categories</h1>
          <p className="text-gray-600">Organize policies by functional area</p>
        </div>
        <Button onClick={() => setAddCategoryDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories?.map(category => (
          <CategoryCard
            key={category.id}
            category={category}
            onEdit={() => setEditingCategory(category)}
            onDelete={() => deleteCategory(category.id)}
          />
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <CategoryDialog
        category={editingCategory}
        open={!!editingCategory || addCategoryDialogOpen}
        onClose={() => {
          setEditingCategory(null);
          setAddCategoryDialogOpen(false);
        }}
      />
    </div>
  );
}

function CategoryCard({ category, onEdit, onDelete }) {
  const { data: policyCount } = usePoliciesByCategory(category.id);

  return (
    <Card className="border-l-4" style={{ borderLeftColor: category.color }}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded flex items-center justify-center"
              style={{ backgroundColor: category.color + '20' }}
            >
              <Icon name={category.icon} className="h-5 w-5" style={{ color: category.color }} />
            </div>
            <div>
              <CardTitle className="text-base">{category.name}</CardTitle>
              <p className="text-xs text-gray-600">{policyCount} policies</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={onEdit}>
                Edit Category
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                Delete Category
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">{category.description}</p>
      </CardContent>
    </Card>
  );
}

function CategoryDialog({ category, open, onClose }) {
  const form = useForm({
    defaultValues: category || {
      name: '',
      description: '',
      icon: 'folder',
      color: '#3b82f6'
    }
  });

  const { mutate: saveCategory } = useSaveCategory();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Add Category'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-4">
            <FormField
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Food Safety" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shield-check">Shield Check</SelectItem>
                        <SelectItem value="badge-check">Badge Check</SelectItem>
                        <SelectItem value="factory">Factory</SelectItem>
                        <SelectItem value="alert-triangle">Alert Triangle</SelectItem>
                        <SelectItem value="users">Users</SelectItem>
                        <SelectItem value="leaf">Leaf</SelectItem>
                        {/* Add more icons */}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Lower numbers appear first
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit((data) => {
            saveCategory(data, {
              onSuccess: () => {
                toast.success('Category saved');
                onClose();
              }
            });
          })}>
            Save Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## **4. POLICY TYPES MANAGEMENT**

### **4.1 Policy Types Settings Page**

**Route:** `/policies/settings/types`

```tsx
function PolicyTypeSettings() {
  const { data: types } = usePolicyTypes();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Policy Types</h1>
          <p className="text-gray-600">Define document types and their requirements</p>
        </div>
        <Button onClick={() => setAddTypeDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Type
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={[
              {
                header: 'Type',
                accessor: 'name',
                cell: (row) => (
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-sm text-gray-600">{row.abbreviation}</div>
                  </div>
                )
              },
              {
                header: 'Description',
                accessor: 'description'
              },
              {
                header: 'Acknowledgement',
                accessor: 'requires_acknowledgement',
                cell: (row) => (
                  row.requires_acknowledgement ? (
                    <Badge variant="default">Required</Badge>
                  ) : (
                    <Badge variant="outline">Optional</Badge>
                  )
                )
              },
              {
                header: 'Review Frequency',
                accessor: 'default_review_frequency_months',
                cell: (row) => `${row.default_review_frequency_months} months`
              },
              {
                header: 'Count',
                accessor: 'policy_count',
                cell: (row) => (
                  <div className="text-center">{row.policy_count || 0}</div>
                )
              },
              {
                header: 'Actions',
                cell: (row) => (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => editType(row)}>
                      Edit
                    </Button>
                    {row.policy_count === 0 && (
                      <Button variant="ghost" size="sm" onClick={() => deleteType(row.id)}>
                        Delete
                      </Button>
                    )}
                  </div>
                )
              }
            ]}
            data={types || []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## **5. TRAINING CONFIGURATION**

### **5.1 Training Settings Page**

**Route:** `/policies/settings/training`

```tsx
function TrainingSettings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Training Configuration</h1>
        <p className="text-gray-600">Configure default training settings and templates</p>
      </div>

      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Training Settings</CardTitle>
          <CardDescription>
            These defaults apply to new training requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Default Training Type</Label>
              <Select defaultValue="Initial">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Initial">Initial (one-time)</SelectItem>
                  <SelectItem value="Refresher">Refresher (periodic)</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Default Review Frequency</Label>
              <Select defaultValue="12">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Every 3 months</SelectItem>
                  <SelectItem value="6">Every 6 months</SelectItem>
                  <SelectItem value="12">Annually</SelectItem>
                  <SelectItem value="24">Every 2 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Default Minimum Passing Score (%)</Label>
            <Input type="number" min="0" max="100" defaultValue="80" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="require-quiz" />
              <Label htmlFor="require-quiz">Require quiz by default</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="auto-certificate" defaultChecked />
              <Label htmlFor="auto-certificate">Auto-generate certificates</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="send-reminders" defaultChecked />
              <Label htmlFor="send-reminders">Send expiration reminders</Label>
            </div>
          </div>

          <div>
            <Label>Reminder Schedule</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="30-day" defaultChecked />
                <Label htmlFor="30-day" className="text-sm">30 days before</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="14-day" defaultChecked />
                <Label htmlFor="14-day" className="text-sm">14 days before</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="overdue" defaultChecked />
                <Label htmlFor="overdue" className="text-sm">When overdue</Label>
              </div>
            </div>
          </div>

          <Button>Save Default Settings</Button>
        </CardContent>
      </Card>

      {/* Quiz Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quiz Templates</CardTitle>
              <CardDescription>
                Create reusable quiz templates for training assessments
              </CardDescription>
            </div>
            <Button onClick={() => setAddQuizTemplateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <QuizTemplateRow name="HACCP Fundamentals Quiz" questions={10} />
            <QuizTemplateRow name="Allergen Control Assessment" questions={15} />
            <QuizTemplateRow name="GMP Knowledge Check" questions={8} />
          </div>
        </CardContent>
      </Card>

      {/* Certificate Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Certificate Templates</CardTitle>
              <CardDescription>
                Customize training completion certificates
              </CardDescription>
            </div>
            <Button onClick={() => setCertificateEditorOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-white text-center">
            <div className="mb-4">
              <h2 className="text-2xl font-serif">Certificate of Completion</h2>
            </div>
            <p className="mb-2">This certifies that</p>
            <p className="text-xl font-semibold mb-2">[Employee Name]</p>
            <p className="mb-2">has successfully completed</p>
            <p className="text-lg font-semibold mb-4">[Training Name]</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Completion Date</p>
                <p>[Date]</p>
              </div>
              <div>
                <p className="text-gray-600">Score</p>
                <p>[Score]%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## **6. APPROVAL WORKFLOW CONFIGURATION**

### **6.1 Approval Workflow Settings**

**Route:** `/policies/settings/approval`

```tsx
function ApprovalWorkflowSettings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Approval Workflow</h1>
        <p className="text-gray-600">Configure review and approval processes</p>
      </div>

      {/* Workflow Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Default Approval Threshold</Label>
            <Select defaultValue="all-required">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any-one">Any one reviewer</SelectItem>
                <SelectItem value="majority">Majority of reviewers</SelectItem>
                <SelectItem value="all-required">All required reviewers</SelectItem>
                <SelectItem value="sequential">Sequential approval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="auto-assign" defaultChecked />
              <Label htmlFor="auto-assign">Auto-assign reviewers by category</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="allow-delegation" />
              <Label htmlFor="allow-delegation">Allow reviewers to delegate</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="reminder-reviewers" defaultChecked />
              <Label htmlFor="reminder-reviewers">Send reminders to reviewers</Label>
            </div>
          </div>

          <div>
            <Label>Review Reminder Schedule</Label>
            <Input type="number" defaultValue="3" className="w-32" />
            <FormDescription>Send reminder after X days of inactivity</FormDescription>
          </div>

          <Button>Save Approval Settings</Button>
        </CardContent>
      </Card>

      {/* Reviewer Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Default Reviewers by Category</CardTitle>
          <CardDescription>
            Auto-assign reviewers based on policy category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: 'Category', accessor: 'category_name' },
              { header: 'Required Reviewers', accessor: 'required_reviewers' },
              { header: 'Optional Reviewers', accessor: 'optional_reviewers' },
              { header: 'Actions', cell: (row) => <Button variant="ghost" size="sm">Edit</Button> }
            ]}
            data={[
              {
                category_name: 'Food Safety',
                required_reviewers: 'QA Manager, Food Safety Director',
                optional_reviewers: 'Production Manager'
              },
              {
                category_name: 'HACCP',
                required_reviewers: 'Food Safety Director, QA Manager',
                optional_reviewers: 'Regulatory Compliance'
              }
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## **7. NUMBERING SCHEME CONFIGURATION**

### **7.1 Numbering Settings Page**

**Route:** `/policies/settings/numbering`

```tsx
function NumberingSettings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Policy Numbering</h1>
        <p className="text-gray-600">Configure automatic policy number generation</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Numbering Scheme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Numbering Format</Label>
            <Select defaultValue="type-year-cat-seq">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="type-year-cat-seq">
                  {'{TYPE}-{YEAR}-{CATEGORY}-{SEQ}'} (e.g., SOP-2024-FS-001)
                </SelectItem>
                <SelectItem value="cat-type-seq">
                  {'{CATEGORY}-{TYPE}-{SEQ}'} (e.g., FS-SOP-001)
                </SelectItem>
                <SelectItem value="simple-seq">
                  {'{TYPE}-{SEQ}'} (e.g., SOP-001)
                </SelectItem>
                <SelectItem value="custom">
                  Custom Format
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Sequence Starting Number</Label>
            <Input type="number" defaultValue="1" />
          </div>

          <div>
            <Label>Sequence Padding</Label>
            <Input type="number" defaultValue="3" />
            <FormDescription>Number of digits (e.g., 3 = 001, 002, 003)</FormDescription>
          </div>

          <div>
            <Label>Preview</Label>
            <div className="p-3 bg-gray-50 rounded border font-mono">
              SOP-2026-FS-001
            </div>
          </div>

          <Button>Save Numbering Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## **8. INTEGRATION SETTINGS**

### **8.1 Manufacturing Integration**

**Route:** `/policies/settings/integration/manufacturing`

```tsx
function ManufacturingIntegrationSettings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manufacturing Integration</h1>
        <p className="text-gray-600">Link policies to production workflows</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>HACCP-Production Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch id="auto-ccp" defaultChecked />
            <Label htmlFor="auto-ccp">
              Automatically include CCP verifications in production runs
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="block-production" defaultChecked />
            <Label htmlFor="block-production">
              Block production if CCP verification fails
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="photo-required" />
            <Label htmlFor="photo-required">
              Require photo evidence for all CCP verifications
            </Label>
          </div>

          <div>
            <Label>CCP Deviation Alert Recipients</Label>
            <MultiSelect
              options={[
                { value: 'qa-manager', label: 'QA Manager' },
                { value: 'prod-supervisor', label: 'Production Supervisor' },
                { value: 'food-safety-dir', label: 'Food Safety Director' }
              ]}
              defaultValue={['qa-manager', 'food-safety-dir']}
            />
          </div>

          <Button>Save Integration Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## **SUMMARY**

The Settings Hub provides centralized control over:

✅ **SQF Code Management**
- Upload new editions
- Manage multiple versions
- View and edit codes
- Track compliance

✅ **Document Organization**
- Categories (with colors and icons)
- Policy types (SOP, HACCP, etc.)
- Tags for cross-referencing
- Hierarchical structure

✅ **Training Configuration**
- Default settings
- Quiz templates
- Certificate templates
- Reminder schedules

✅ **Workflow Settings**
- Approval rules
- Reviewer assignments
- Notification settings
- Delegation rules

✅ **Numbering Schemes**
- Custom formats
- Auto-generation
- Sequence management

✅ **Integration**
- Manufacturing link settings
- HR sync configuration
- Export/import settings
- API connections

All accessible from: `/policies/settings` with role-based access control.
