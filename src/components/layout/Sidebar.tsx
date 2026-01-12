import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Package,
  Factory,
  Users,
  ClipboardCheck,
  ShoppingCart,
  Truck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  IceCream,
  Clock,
  Calendar,
  FileText,
  CalendarCheck,
  Shield,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  requiredRole?: 'admin' | 'manager' | 'supervisor' | 'employee';
  children?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: Package,
    children: [
      { title: 'Material Inventory', href: '/inventory/on-hand' },
      { title: 'Materials', href: '/inventory/materials' },
      { title: 'Products', href: '/inventory/products' },
      { title: 'Stock Levels', href: '/inventory/stock' },
    ],
  },
  {
    title: 'Manufacturing',
    href: '/manufacturing',
    icon: Factory,
    children: [
      { title: 'Production Dashboard', href: '/manufacturing/dashboard' },
      { title: 'Production Execution', href: '/manufacturing/production' },
      { title: 'Daily Production', href: '/manufacturing/daily' },
      { title: 'Batch Tracking', href: '/manufacturing/batches' },
      { title: 'Recipes / BOMs', href: '/manufacturing/recipes' },
    ],
  },
  {
    title: 'Purchasing',
    href: '/purchasing',
    icon: ShoppingCart,
    children: [
      { title: 'Purchase Orders', href: '/purchasing/orders' },
      { title: 'Suppliers', href: '/purchasing/suppliers' },
      { title: 'Receiving', href: '/purchasing/receiving' },
    ],
  },
  {
    title: 'Sales',
    href: '/sales',
    icon: Truck,
    children: [
      { title: 'Customers', href: '/sales/customers' },
      { title: 'Orders', href: '/sales/orders' },
      { title: 'Invoices', href: '/sales/invoices' },
    ],
  },
  {
    title: 'Quality & Safety',
    href: '/quality',
    icon: ClipboardCheck,
    children: [
      { title: 'QA Dashboard', href: '/quality/dashboard' },
      { title: 'Document Watchlist', href: '/quality/documents' },
    ],
  },
  {
    title: 'Operations',
    href: '/operations',
    icon: CalendarCheck,
    requiredRole: 'manager',
    children: [
      { title: 'Close Day', href: '/operations/close-day' },
    ],
  },
  {
    title: 'Scheduling',
    href: '/scheduling',
    icon: Calendar,
    children: [
      { title: 'Employee Schedule', href: '/scheduling/employees' },
      { title: 'Production Schedule', href: '/scheduling/production' },
      { title: 'Time Clock', href: '/scheduling/timeclock' },
    ],
  },
  {
    title: 'Employees',
    href: '/employees',
    icon: Users,
    requiredRole: 'manager',
    children: [
      { title: 'Directory', href: '/employees/directory' },
      { title: 'Timesheets', href: '/employees/timesheets' },
      { title: 'PTO Requests', href: '/employees/pto' },
    ],
  },
  {
    title: 'Reports & KPIs',
    href: '/reports',
    icon: BarChart3,
    children: [
      { title: 'Profit & Loss', href: '/reports/profit-loss' },
      { title: 'KPI Dashboard', href: '/reports/kpi' },
      { title: 'Production Reports', href: '/reports/production' },
      { title: 'Labor Analytics', href: '/reports/labor' },
    ],
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: FileText,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    requiredRole: 'manager',
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const location = useLocation();
  const { role, isAdmin, isManager } = useAuth();

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const canAccess = (item: NavItem) => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === 'admin') return isAdmin;
    if (item.requiredRole === 'manager') return isManager;
    return true;
  };

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <IceCream className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Muse ERP</span>
          </div>
        )}
        {collapsed && <IceCream className="h-6 w-6 text-primary mx-auto" />}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && 'mx-auto')}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {navItems.filter(canAccess).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href ||
              location.pathname.startsWith(item.href + '/');
            const isExpanded = expandedItems.includes(item.title);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.title}>
                {hasChildren ? (
                  <>
                    <button
                      onClick={() => toggleExpanded(item.title)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        isActive && 'bg-accent text-accent-foreground font-medium'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.title}</span>
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 transition-transform',
                              isExpanded && 'rotate-90'
                            )}
                          />
                        </>
                      )}
                    </button>
                    {!collapsed && isExpanded && (
                      <div className="ml-7 mt-1 space-y-1">
                        {item.children?.map((child) => (
                          <NavLink
                            key={child.href}
                            to={child.href}
                            className={cn(
                              'block rounded-lg px-3 py-2 text-sm transition-colors',
                              'hover:bg-accent hover:text-accent-foreground'
                            )}
                            activeClassName="bg-primary/10 text-primary font-medium"
                          >
                            {child.title}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground'
                    )}
                    activeClassName="bg-accent text-accent-foreground font-medium"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Time Clock Quick Access */}
      {!collapsed && (
        <div className="border-t p-4">
          <NavLink to="/kiosk/timeclock">
            <Button variant="outline" className="w-full gap-2">
              <Clock className="h-4 w-4" />
              Time Clock
            </Button>
          </NavLink>
        </div>
      )}
    </aside>
  );
}
