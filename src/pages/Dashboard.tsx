import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Factory,
  ShoppingCart,
  Users,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && (
            <Badge variant={trend.isPositive ? 'default' : 'destructive'} className="text-xs">
              {trend.isPositive ? '+' : ''}{trend.value}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { profile, role } = useAuth();

  // Placeholder stats - will be replaced with real data
  const stats = [
    {
      title: "Today's Production",
      value: '—',
      description: 'Batches completed',
      icon: Factory,
    },
    {
      title: 'Inventory Items',
      value: '—',
      description: 'Active materials & products',
      icon: Package,
    },
    {
      title: 'Open Orders',
      value: '—',
      description: 'Pending fulfillment',
      icon: ShoppingCart,
    },
    {
      title: 'Employees On Shift',
      value: '—',
      description: 'Currently clocked in',
      icon: Users,
    },
  ];

  const alerts = [
    {
      title: 'Low Stock Alert',
      description: 'Configure inventory thresholds to see alerts',
      type: 'warning' as const,
    },
    {
      title: 'Quality Tests Pending',
      description: 'Set up quality testing to track results',
      type: 'info' as const,
    },
    {
      title: 'Expiring Documents',
      description: 'Add documents to track expirations',
      type: 'info' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Muse ERP. Here's an overview of your operations.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="rounded-lg border p-3 hover:bg-accent cursor-pointer transition-colors">
              <div className="font-medium">Start Production Batch</div>
              <div className="text-sm text-muted-foreground">Record daily manufacturing</div>
            </div>
            <div className="rounded-lg border p-3 hover:bg-accent cursor-pointer transition-colors">
              <div className="font-medium">Receive Inventory</div>
              <div className="text-sm text-muted-foreground">Log incoming materials</div>
            </div>
            <div className="rounded-lg border p-3 hover:bg-accent cursor-pointer transition-colors">
              <div className="font-medium">Record Quality Test</div>
              <div className="text-sm text-muted-foreground">Log test results</div>
            </div>
            <div className="rounded-lg border p-3 hover:bg-accent cursor-pointer transition-colors">
              <div className="font-medium">Create Purchase Order</div>
              <div className="text-sm text-muted-foreground">Order from suppliers</div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alerts & Notifications
            </CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <AlertTriangle
                  className={`h-5 w-5 mt-0.5 ${
                    alert.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                  }`}
                />
                <div>
                  <div className="font-medium">{alert.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {alert.description}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Getting Started
          </CardTitle>
          <CardDescription>
            Complete these steps to set up your ERP system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  1
                </div>
                <span className="font-medium">Add Materials</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Set up your raw materials and ingredients
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  2
                </div>
                <span className="font-medium">Create Products</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Define your products and BOMs
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  3
                </div>
                <span className="font-medium">Add Suppliers</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure your vendor relationships
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  4
                </div>
                <span className="font-medium">Invite Team</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Add employees and assign roles
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
