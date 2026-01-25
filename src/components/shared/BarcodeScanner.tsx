import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, CheckCircle, XCircle, Camera, Keyboard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  expectedValue?: string;
  placeholder?: string;
  label?: string;
  validated?: boolean;
  validationError?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const BarcodeScanner = ({
  onScan,
  expectedValue,
  placeholder = "Enter or scan barcode...",
  label,
  validated,
  validationError,
  disabled = false,
  autoFocus = false
}: BarcodeScannerProps) => {
  const [inputMode, setInputMode] = useState<'scan' | 'manual'>('scan');
  const [manualValue, setManualValue] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current && inputMode === 'manual') {
      inputRef.current.focus();
    }
  }, [autoFocus, inputMode]);

  // Handle barcode scanner input (typically fast sequential keystrokes)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && manualValue.trim()) {
      e.preventDefault();
      onScan(manualValue.trim());
    }
  };

  const handleManualSubmit = () => {
    if (manualValue.trim()) {
      onScan(manualValue.trim());
    }
  };

  // Simulated camera scan - in production this would use a barcode scanning library
  const handleCameraScan = () => {
    setIsScanning(true);
    // Simulate camera capture - in production, integrate with a library like @zxing/browser
    setTimeout(() => {
      setIsScanning(false);
      // For demo purposes, if we have an expected value, use that
      if (expectedValue) {
        onScan(expectedValue);
      }
    }, 1500);
  };

  // File input for capturing barcode image
  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsScanning(true);
      // In production, this would process the image with a barcode library
      setTimeout(() => {
        setIsScanning(false);
        if (expectedValue) {
          onScan(expectedValue);
        }
      }, 1500);
    }
  };

  // Trigger vibration on mobile for feedback
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  if (validated) {
    triggerHaptic();
    return (
      <div className="flex items-center justify-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
        <CheckCircle className="h-6 w-6 text-green-600" />
        <span className="text-green-700 dark:text-green-400 font-medium">
          {label || 'Barcode'} Verified
        </span>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
          <XCircle className="h-6 w-6 text-red-600" />
          <span className="text-red-700 dark:text-red-400 font-medium">
            {validationError}
          </span>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setManualValue("")}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-sm text-muted-foreground text-center">{label}</p>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={inputMode === 'scan' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => setInputMode('scan')}
          disabled={disabled}
        >
          <Camera className="h-4 w-4 mr-2" />
          Camera
        </Button>
        <Button
          type="button"
          variant={inputMode === 'manual' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => setInputMode('manual')}
          disabled={disabled}
        >
          <Keyboard className="h-4 w-4 mr-2" />
          Manual
        </Button>
      </div>

      {inputMode === 'scan' ? (
        <div className="space-y-2">
          {/* Hidden file input for camera capture */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileCapture}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full h-20 text-lg border-2 border-dashed",
              isScanning && "bg-muted"
            )}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <QrCode className="h-6 w-6 mr-3" />
                Tap to Scan Barcode
              </>
            )}
          </Button>

          {/* For testing/demo - simulate scan */}
          {expectedValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={handleCameraScan}
              disabled={disabled || isScanning}
            >
              Demo: Simulate successful scan
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="h-14 text-lg font-mono"
              disabled={disabled}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>
          <Button
            type="button"
            className="w-full h-12"
            onClick={handleManualSubmit}
            disabled={disabled || !manualValue.trim()}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Submit
          </Button>
          {expectedValue && (
            <p className="text-xs text-muted-foreground text-center">
              Expected: <span className="font-mono">{expectedValue}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
