import { Link } from 'react-router-dom';
import { ChevronRight, Settings } from 'lucide-react';

interface SettingsBreadcrumbProps {
  currentPage: string;
}

export function SettingsBreadcrumb({ currentPage }: SettingsBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
      <Link 
        to="/settings" 
        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
      >
        <Settings className="h-4 w-4" />
        <span>Settings</span>
      </Link>
      <ChevronRight className="h-4 w-4" />
      <span className="text-foreground font-medium">{currentPage}</span>
    </nav>
  );
}
