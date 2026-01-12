import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTrainingProgress, useUpdateTrainingProgress } from '@/hooks/useQualityManagement';
import { ChevronLeft, ChevronRight, GraduationCap, X } from 'lucide-react';

export interface TrainingStep {
  title: string;
  content: string;
  target?: string; // CSS selector to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface TrainingOverlayProps {
  moduleKey: string;
  moduleName: string;
  steps: TrainingStep[];
  onComplete?: () => void;
}

export function TrainingOverlay({ moduleKey, moduleName, steps, onComplete }: TrainingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const { data: progress, isLoading } = useTrainingProgress(moduleKey);
  const updateProgress = useUpdateTrainingProgress();

  useEffect(() => {
    // Show overlay if user hasn't completed or skipped this module
    if (!isLoading && !progress?.completed_at && !progress?.skipped_at) {
      setIsVisible(true);
      setCurrentStep(progress?.last_step_viewed || 0);
    }
  }, [progress, isLoading]);

  useEffect(() => {
    // Highlight target element
    const step = steps[currentStep];
    if (step?.target && isVisible) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setHighlightRect(null);
      }
    } else {
      setHighlightRect(null);
    }
  }, [currentStep, steps, isVisible]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      updateProgress.mutate({ moduleKey, step: nextStep });
    } else {
      // Complete
      updateProgress.mutate({ moduleKey, completed: true });
      setIsVisible(false);
      onComplete?.();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      updateProgress.mutate({ moduleKey, step: prevStep });
    }
  };

  const handleSkip = () => {
    updateProgress.mutate({ moduleKey, skipped: true });
    setIsVisible(false);
  };

  if (!isVisible || isLoading) return null;

  const step = steps[currentStep];
  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  // Calculate card position
  const getCardPosition = () => {
    if (!highlightRect || step.position === 'center') {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const padding = 20;
    const cardWidth = 400;
    const cardHeight = 250;

    switch (step.position) {
      case 'top':
        return {
          top: Math.max(padding, highlightRect.top - cardHeight - padding),
          left: Math.max(padding, highlightRect.left + highlightRect.width / 2 - cardWidth / 2),
        };
      case 'bottom':
        return {
          top: highlightRect.bottom + padding,
          left: Math.max(padding, highlightRect.left + highlightRect.width / 2 - cardWidth / 2),
        };
      case 'left':
        return {
          top: Math.max(padding, highlightRect.top + highlightRect.height / 2 - cardHeight / 2),
          left: Math.max(padding, highlightRect.left - cardWidth - padding),
        };
      case 'right':
        return {
          top: Math.max(padding, highlightRect.top + highlightRect.height / 2 - cardHeight / 2),
          left: highlightRect.right + padding,
        };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with cutout for highlighted element */}
      <div className="absolute inset-0 bg-black/60">
        {highlightRect && (
          <div
            className="absolute bg-transparent ring-4 ring-primary ring-offset-4 ring-offset-transparent rounded-lg"
            style={{
              top: highlightRect.top - 4,
              left: highlightRect.left - 4,
              width: highlightRect.width + 8,
              height: highlightRect.height + 8,
            }}
          />
        )}
      </div>

      {/* Training card */}
      <Card
        className="fixed w-[400px] max-w-[90vw] shadow-2xl"
        style={getCardPosition()}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">{moduleName}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardTitle className="text-lg">{step.title}</CardTitle>
          <Progress value={progressPercent} className="h-1" />
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{step.content}</p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button size="sm" onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

// Predefined training modules
export const TRAINING_MODULES = {
  production: {
    moduleKey: 'production_execution',
    moduleName: 'Production Execution',
    steps: [
      {
        title: 'Welcome to Production',
        content: 'This guide will walk you through how to execute production runs, weigh ingredients, and record output.',
        position: 'center' as const,
      },
      {
        title: 'Select a Product',
        content: 'Start by selecting the product you want to manufacture from the product dropdown.',
        target: '[data-training="product-select"]',
        position: 'bottom' as const,
      },
      {
        title: 'Enter Batch Size',
        content: 'Enter the target batch size. The system will calculate required ingredient quantities.',
        target: '[data-training="batch-size"]',
        position: 'bottom' as const,
      },
      {
        title: 'Weigh Ingredients',
        content: 'Use the weighing cards to record actual weights. Scan lot barcodes for traceability.',
        target: '[data-training="weighing-section"]',
        position: 'top' as const,
      },
      {
        title: 'Record Output',
        content: 'After production, enter the actual yield and complete the batch.',
        target: '[data-training="complete-btn"]',
        position: 'top' as const,
      },
    ],
  },
  receiving: {
    moduleKey: 'receiving_materials',
    moduleName: 'Receiving Materials',
    steps: [
      {
        title: 'Welcome to Receiving',
        content: 'Learn how to receive materials against purchase orders and record lot information.',
        position: 'center' as const,
      },
      {
        title: 'Select Purchase Order',
        content: 'Choose the PO you are receiving materials for.',
        target: '[data-training="po-select"]',
        position: 'bottom' as const,
      },
      {
        title: 'Enter Lot Details',
        content: 'Record supplier lot numbers, quantities, and any quality issues.',
        target: '[data-training="lot-entry"]',
        position: 'right' as const,
      },
    ],
  },
  quality: {
    moduleKey: 'quality_dashboard',
    moduleName: 'Quality Dashboard',
    steps: [
      {
        title: 'Quality Management',
        content: 'Track complaints, monitor trends, and evaluate supplier performance.',
        position: 'center' as const,
      },
      {
        title: 'Create Complaints',
        content: 'Use the New Complaint button to log quality issues.',
        target: '[data-training="new-complaint"]',
        position: 'bottom' as const,
      },
      {
        title: 'View Trends',
        content: 'The Trends tab shows historical data to identify patterns.',
        target: '[data-training="trends-tab"]',
        position: 'bottom' as const,
      },
    ],
  },
};
