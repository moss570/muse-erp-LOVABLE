import { Link, useLocation } from 'react-router-dom';
import { LucideIcon, Home, ClipboardList, Clock, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: LucideIcon;
  label: string;
  to: string;
}

interface MobileNavBarProps {
  items?: NavItem[];
}

const defaultItems: NavItem[] = [
  { icon: Home, label: 'Home', to: '/mobile' },
  { icon: ClipboardList, label: 'Tasks', to: '/employee/work-queue' },
  { icon: Clock, label: 'Clock', to: '/kiosk/timeclock' },
  { icon: MessageCircle, label: 'Chat', to: '/chat' },
  { icon: User, label: 'Profile', to: '/settings/profile' },
];

export function MobileNavBar({ items = defaultItems }: MobileNavBarProps) {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/mobile' && location.pathname.startsWith(item.to));
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors touch-manipulation',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 mb-1', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
