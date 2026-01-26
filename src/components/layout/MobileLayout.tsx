import { ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MobileNavBar } from '@/components/mobile/MobileNavBar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LayoutGrid, Loader2 } from 'lucide-react';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  showFullAppLink?: boolean;
  hideNavBar?: boolean;
}

export function MobileLayout({ 
  children, 
  title,
  showBack = false,
  showFullAppLink = true,
  hideNavBar = false,
}: MobileLayoutProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border safe-area-inset-top">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            {showBack && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(-1)}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {title && (
              <h1 className="text-lg font-semibold truncate">{title}</h1>
            )}
          </div>
          
          {showFullAppLink && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-xs gap-1"
            >
              <LayoutGrid className="h-4 w-4" />
              Full App
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${hideNavBar ? '' : 'pb-20'}`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {!hideNavBar && <MobileNavBar />}
    </div>
  );
}
