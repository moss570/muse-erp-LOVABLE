import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileMode, MobileDepartment } from '@/contexts/MobileModeContext';
import { useEmployeeDepartment } from '@/hooks/useEmployeeDepartment';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { QuickActionCard } from '@/components/mobile/QuickActionCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Factory, 
  Warehouse, 
  ClipboardCheck, 
  Clock, 
  MessageCircle, 
  ClipboardList,
  Package,
  ArrowRightLeft,
  Truck,
  FlaskConical,
  Calendar,
  User,
  LayoutGrid,
  ChevronRight
} from 'lucide-react';

// Quick actions by department
const warehouseActions = [
  { title: 'Putaway Tasks', icon: Package, to: '/warehouse/putaway', variant: 'primary' as const },
  { title: 'Issue to Production', icon: ArrowRightLeft, to: '/warehouse/issue-to-production', variant: 'default' as const },
  { title: 'Cycle Counts', icon: ClipboardCheck, to: '/warehouse/cycle-counts', variant: 'default' as const },
  { title: 'Transfers', icon: Truck, to: '/warehouse/transfers', variant: 'default' as const },
  { title: 'Time Clock', icon: Clock, to: '/kiosk/timeclock', variant: 'success' as const },
  { title: 'Chat', icon: MessageCircle, to: '/chat', variant: 'muted' as const },
];

const manufacturingActions = [
  { title: 'Shop Floor', icon: Factory, to: '/manufacturing/shop-floor', variant: 'primary' as const },
  { title: 'My Work Orders', icon: ClipboardList, to: '/manufacturing/lots', variant: 'default' as const },
  { title: 'Time Clock', icon: Clock, to: '/kiosk/timeclock', variant: 'success' as const },
  { title: 'My Tasks', icon: ClipboardCheck, to: '/employee/work-queue', variant: 'default' as const },
  { title: 'QA Testing', icon: FlaskConical, to: '/qa/work-queue', variant: 'warning' as const },
  { title: 'Chat', icon: MessageCircle, to: '/chat', variant: 'muted' as const },
];

const qualityActions = [
  { title: 'QA Work Queue', icon: FlaskConical, to: '/qa/work-queue', variant: 'primary' as const },
  { title: 'Receiving Inspections', icon: ClipboardCheck, to: '/qa/receiving-inspections', variant: 'default' as const },
  { title: 'Non-Conformities', icon: ClipboardList, to: '/quality/non-conformities', variant: 'warning' as const },
  { title: 'Time Clock', icon: Clock, to: '/kiosk/timeclock', variant: 'success' as const },
  { title: 'Chat', icon: MessageCircle, to: '/chat', variant: 'muted' as const },
];

const employeeActions = [
  { title: 'My Portal', icon: User, to: '/employee/portal', variant: 'primary' as const },
  { title: 'Work Queue', icon: ClipboardList, to: '/employee/work-queue', variant: 'default' as const },
  { title: 'Time Clock', icon: Clock, to: '/kiosk/timeclock', variant: 'success' as const },
  { title: 'My Schedule', icon: Calendar, to: '/employee/my-schedule', variant: 'default' as const },
  { title: 'Chat', icon: MessageCircle, to: '/chat', variant: 'muted' as const },
  { title: 'Profile', icon: User, to: '/settings/profile', variant: 'muted' as const },
];

const departmentLabels: Record<MobileDepartment, string> = {
  warehouse: 'Warehouse',
  manufacturing: 'Manufacturing',
  quality: 'Quality Control',
  employee: 'Employee',
  auto: 'Auto-Detect',
};

const departmentIcons: Record<MobileDepartment, typeof Warehouse> = {
  warehouse: Warehouse,
  manufacturing: Factory,
  quality: FlaskConical,
  employee: User,
  auto: LayoutGrid,
};

function getActionsForDepartment(dept: MobileDepartment) {
  switch (dept) {
    case 'warehouse':
      return warehouseActions;
    case 'manufacturing':
      return manufacturingActions;
    case 'quality':
      return qualityActions;
    case 'employee':
    case 'auto':
    default:
      return employeeActions;
  }
}

export default function MobileLauncher() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { activeDepartment, setActiveDepartment, setMobileMode } = useMobileMode();
  const { mobileDepartment, departmentName, isLoading: deptLoading } = useEmployeeDepartment();

  // Auto-set department on first load if set to 'auto'
  useEffect(() => {
    if (activeDepartment === 'auto' && mobileDepartment && !deptLoading) {
      setActiveDepartment(mobileDepartment);
    }
  }, [activeDepartment, mobileDepartment, deptLoading, setActiveDepartment]);

  // Mark that we're in mobile mode
  useEffect(() => {
    setMobileMode(true);
  }, [setMobileMode]);

  const effectiveDepartment = activeDepartment === 'auto' ? mobileDepartment : activeDepartment;
  const actions = getActionsForDepartment(effectiveDepartment);
  const DeptIcon = departmentIcons[effectiveDepartment];

  // Build display name from first/last name or email
  const displayName = profile?.first_name 
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`
    : profile?.email?.split('@')[0] || 'User';

  

  return (
    <MobileLayout showFullAppLink={true} hideNavBar={false}>
      <div className="p-4 space-y-6">
        {/* Welcome Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Welcome back</h2>
          <p className="text-lg text-muted-foreground">{displayName}</p>
        </div>

        {/* Department Badge */}
        <div className="flex items-center gap-2">
          {deptLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <>
              <Badge variant="secondary" className="gap-1 py-1.5 px-3">
                <DeptIcon className="h-4 w-4" />
                {departmentLabels[effectiveDepartment]}
              </Badge>
              {departmentName && effectiveDepartment !== 'employee' && (
                <span className="text-sm text-muted-foreground">({departmentName})</span>
              )}
            </>
          )}
        </div>

        {/* Quick Actions Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((action) => (
              <QuickActionCard
                key={action.to}
                title={action.title}
                icon={action.icon}
                to={action.to}
                variant={action.variant}
              />
            ))}
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Switch Mode
          </h3>
          <div className="space-y-2">
            {(['warehouse', 'manufacturing', 'quality', 'employee'] as MobileDepartment[]).map((dept) => {
              const Icon = departmentIcons[dept];
              const isActive = effectiveDepartment === dept;
              
              return (
                <Button
                  key={dept}
                  variant={isActive ? 'default' : 'outline'}
                  className="w-full justify-between h-12"
                  onClick={() => setActiveDepartment(dept)}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {departmentLabels[dept]} Mode
                  </span>
                  {isActive && <ChevronRight className="h-4 w-4" />}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Full App Link */}
        <div className="pt-4">
          <Button
            variant="ghost"
            className="w-full justify-center gap-2 text-muted-foreground"
            onClick={() => {
              setMobileMode(false);
              navigate('/');
            }}
          >
            <LayoutGrid className="h-4 w-4" />
            Switch to Full Desktop App
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
