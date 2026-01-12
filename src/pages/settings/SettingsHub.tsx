import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Package,
  Factory,
  ClipboardCheck,
  Settings,
  MapPin,
  Cog,
  Layers,
  FileText,
  Scale,
  Users,
  Building,
  Ruler,
  Tags,
  Upload,
  Shield,
  FileStack,
  Building2,
  Tag,
  DollarSign,
  BookOpen,
  CalendarCheck,
  Link2,
} from 'lucide-react';

interface SettingItem {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  status?: 'active' | 'coming-soon';
}

interface SettingCategory {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  items: SettingItem[];
}

const settingsCategories: SettingCategory[] = [
  {
    title: 'Inventory Settings',
    description: 'Configure materials, products, and stock management',
    icon: Package,
    color: 'bg-blue-500/10 text-blue-500',
    items: [
      {
        title: 'Sub-Categories',
        description: 'Manage material sub-categories for different material types',
        href: '/settings/sub-categories',
        icon: Layers,
        status: 'active',
      },
      {
        title: 'Units of Measure',
        description: 'Configure units for materials and products',
        href: '/settings/units',
        icon: Ruler,
        status: 'active',
      },
      {
        title: 'Material Names',
        description: 'Manage listed material names for standardization',
        href: '/settings/material-names',
        icon: Tags,
        status: 'active',
      },
    ],
  },
  {
    title: 'Production Settings',
    description: 'Manage machines, locations, and production configuration',
    icon: Factory,
    color: 'bg-orange-500/10 text-orange-500',
    items: [
      {
        title: 'Locations',
        description: 'Manage warehouses, storage areas, and facility locations',
        href: '/settings/locations',
        icon: MapPin,
        status: 'active',
      },
      {
        title: 'Machines',
        description: 'Configure production machines and equipment',
        href: '/settings/machines',
        icon: Cog,
        status: 'active',
      },
      {
        title: 'Departments',
        description: 'Organize teams and work areas',
        href: '/settings/departments',
        icon: Building,
        status: 'active',
      },
    ],
  },
  {
    title: 'Quality Settings',
    description: 'Document requirements and compliance configuration',
    icon: ClipboardCheck,
    color: 'bg-green-500/10 text-green-500',
    items: [
      {
        title: 'Document Requirements',
        description: 'Configure required documents for suppliers and materials',
        href: '/settings/document-requirements',
        icon: FileText,
        status: 'active',
      },
      {
        title: 'Document & Email Templates',
        description: 'Manage printable documents and email templates with merge fields',
        href: '/settings/templates',
        icon: FileStack,
        status: 'active',
      },
      {
        title: 'Quality Tests',
        description: 'Define quality test parameters and thresholds',
        href: '/settings/quality-tests',
        icon: Scale,
        status: 'coming-soon',
      },
    ],
  },
  {
    title: 'Financial Settings',
    description: 'Fixed costs, GL accounts, and period management',
    icon: DollarSign,
    color: 'bg-emerald-500/10 text-emerald-500',
    items: [
      {
        title: 'Fixed Costs',
        description: 'Manage recurring costs and overhead rates',
        href: '/settings/fixed-costs',
        icon: DollarSign,
        status: 'active',
      },
      {
        title: 'GL Accounts',
        description: 'Configure chart of accounts and Xero mapping',
        href: '/settings/gl-accounts',
        icon: BookOpen,
        status: 'active',
      },
      {
        title: 'Category GL Defaults',
        description: 'Set default GL accounts for each material category',
        href: '/settings/category-gl-defaults',
        icon: Tags,
        status: 'active',
      },
      {
        title: 'Period Close',
        description: 'Manage accounting periods and close process',
        href: '/settings/period-close',
        icon: CalendarCheck,
        status: 'active',
      },
      {
        title: 'Xero Configuration',
        description: 'Connect to Xero and map manufacturing accounts',
        href: '/settings/xero',
        icon: Link2,
        status: 'active',
      },
    ],
  },
  {
    title: 'System Settings',
    description: 'User management, roles, and system configuration',
    icon: Settings,
    color: 'bg-purple-500/10 text-purple-500',
    items: [
      {
        title: 'Company Settings',
        description: 'Configure company name, address, and contact information',
        href: '/settings/company',
        icon: Building2,
        status: 'active',
      },
      {
        title: 'User Management',
        description: 'Manage user accounts and permissions',
        href: '/settings/users',
        icon: Users,
        status: 'active',
      },
      {
        title: 'Role Permissions',
        description: 'Configure access levels for each role',
        href: '/settings/permissions',
        icon: Shield,
        status: 'active',
      },
      {
        title: 'Label Templates',
        description: 'Configure label layouts for receiving, production, and shipping',
        href: '/settings/labels',
        icon: Tag,
        status: 'active',
      },
      {
        title: 'Import / Export',
        description: 'Import and export data from CSV files',
        href: '/settings/import-export',
        icon: Upload,
        status: 'active',
      },
    ],
  },
];

export default function SettingsHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return settingsCategories;

    const query = searchQuery.toLowerCase();
    
    return settingsCategories
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            category.title.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [searchQuery]);

  const totalSettings = settingsCategories.reduce(
    (acc, cat) => acc + cat.items.length,
    0
  );
  
  const activeSettings = settingsCategories.reduce(
    (acc, cat) => acc + cat.items.filter((item) => item.status === 'active').length,
    0
  );

  const handleSettingClick = (item: SettingItem) => {
    if (item.status === 'active') {
      navigate(item.href);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure and customize your ERP system ({activeSettings} of {totalSettings} available)
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search settings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories Grid */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No settings found matching "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredCategories.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <Card key={category.title} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${category.color}`}>
                      <CategoryIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {category.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {category.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = item.status === 'active';
                      return (
                        <button
                          key={item.title}
                          onClick={() => handleSettingClick(item)}
                          disabled={!isActive}
                          className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                            isActive
                              ? 'hover:bg-accent hover:border-accent-foreground/20 cursor-pointer'
                              : 'opacity-60 cursor-not-allowed bg-muted/30'
                          }`}
                        >
                          <ItemIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{item.title}</span>
                              {!isActive && (
                                <Badge variant="secondary" className="text-xs">
                                  Coming Soon
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {item.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
