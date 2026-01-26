import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCreateSQFEdition, useUploadSQFDocument, useParseSQFDocument } from '@/hooks/useSQFEditions';
import { toast } from 'sonner';
import type { SQFEditionFormData } from '@/types/sqf';

type Step = 'upload' | 'metadata' | 'parsing' | 'review';

interface ParsingProgress {
  current: string;
  completed: string[];
}

export default function SQFEditionUpload() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [parsingProgress, setParsingProgress] = useState<ParsingProgress>({
    current: '',
    completed: [],
  });
  const [extractedData, setExtractedData] = useState<any>(null);

  const [formData, setFormData] = useState<SQFEditionFormData>({
    edition_name: '',
    edition_number: null,
    release_date: '',
    effective_date: null,
    description: null,
    change_summary: null,
    applicable_to: null,
  });

  const createEdition = useCreateSQFEdition();
  const uploadDocument = useUploadSQFDocument();
  const parseDocument = useParseSQFDocument();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.match(/\.(pdf|docx?)$/i)) {
        toast.error('Please upload a PDF or Word document');
        return;
      }

      // Validate file size (max 50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }

      setFile(selectedFile);
      toast.success('File selected successfully');
    }
  };

  const handleMetadataSubmit = async () => {
    // Validate required fields
    if (!formData.edition_name || !formData.release_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Create edition record
      const edition = await createEdition.mutateAsync(formData);
      setEditionId(edition.id);

      if (file) {
        // Upload document
        await uploadDocument.mutateAsync({
          editionId: edition.id,
          file,
        });

        // Move to parsing step
        setStep('parsing');

        // Start parsing
        setParsingProgress({ current: 'Uploading document...', completed: [] });

        setTimeout(() => {
          setParsingProgress({
            current: 'Extracting text from PDF...',
            completed: ['Uploading document...'],
          });
        }, 1000);

        setTimeout(async () => {
          setParsingProgress({
            current: 'Identifying SQF codes...',
            completed: ['Uploading document...', 'Extracting text from PDF...'],
          });

          // Trigger AI parsing
          try {
            const result = await parseDocument.mutateAsync({
              edition_id: edition.id,
              file_url: '', // Will be fetched by edge function
            });

            setParsingProgress({
              current: 'Complete',
              completed: [
                'Uploading document...',
                'Extracting text from PDF...',
                'Identifying SQF codes...',
                'Analyzing requirements...',
              ],
            });

            setExtractedData(result);
            setStep('review');
            toast.success(`Successfully extracted ${result.codes_extracted} SQF codes!`);
          } catch (error: any) {
            toast.error(`Parsing failed: ${error.message}`);
            setParsingProgress({
              current: 'Failed',
              completed: [],
            });
          }
        }, 2000);
      } else {
        // No file, skip to review
        setStep('review');
      }
    } catch (error: any) {
      toast.error(`Failed to create edition: ${error.message}`);
    }
  };

  const handleComplete = () => {
    toast.success('SQF Edition created successfully!');
    navigate(`/settings/sqf-editions/${editionId}`);
  };

  const getStepNumber = (s: Step) => {
    const steps: Step[] = ['upload', 'metadata', 'parsing', 'review'];
    return steps.indexOf(s) + 1;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Upload SQF Edition</h1>
        <p className="text-muted-foreground mt-1">
          Upload and parse an SQF code requirements document
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {(['upload', 'metadata', 'parsing', 'review'] as Step[]).map((s, idx) => (
          <div key={s} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  getStepNumber(s) <= getStepNumber(step)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {getStepNumber(s)}
              </div>
              <span className="text-sm font-medium capitalize">{s}</span>
            </div>
            {idx < 3 && (
              <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload SQF Document</CardTitle>
            <CardDescription>
              Select an SQF code requirements document (PDF or Word)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => document.getElementById('sqf-file-upload')?.click()}
            >
              <input
                type="file"
                id="sqf-file-upload"
                accept=".pdf,.docx,.doc"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div className="space-y-2">
                  <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
                  <p className="text-lg font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                    Change File
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Upload SQF Document</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PDF or Word document (max 50MB)
                  </p>
                </>
              )}
            </div>

            {/* Upload Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardContent className="pt-6">
                  <FileText className="h-8 w-8 text-blue-600 mb-2" />
                  <h3 className="font-semibold">With AI Parsing</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI will extract all SQF codes and requirements automatically
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-accent transition-colors opacity-50">
                <CardContent className="pt-6">
                  <FileText className="h-8 w-8 text-gray-600 mb-2" />
                  <h3 className="font-semibold">Manual Entry</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter codes manually (coming soon)
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigate('/settings/sqf-editions')}>
                Cancel
              </Button>
              <Button onClick={() => setStep('metadata')} disabled={!file}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Metadata */}
      {step === 'metadata' && (
        <Card>
          <CardHeader>
            <CardTitle>Edition Information</CardTitle>
            <CardDescription>
              Provide details about this SQF edition
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edition_name">Edition Name *</Label>
                <Input
                  id="edition_name"
                  placeholder="e.g., Edition 9.1"
                  value={formData.edition_name}
                  onChange={(e) => setFormData({ ...formData, edition_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edition_number">Edition Number</Label>
                <Input
                  id="edition_number"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 9.1"
                  value={formData.edition_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, edition_number: parseFloat(e.target.value) || null })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="release_date">Release Date *</Label>
                <Input
                  id="release_date"
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="effective_date">Effective Date</Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={formData.effective_date || ''}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value || null })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this edition..."
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="change_summary">Changes from Previous Edition</Label>
              <Textarea
                id="change_summary"
                placeholder="Summary of changes..."
                rows={3}
                value={formData.change_summary || ''}
                onChange={(e) => setFormData({ ...formData, change_summary: e.target.value || null })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleMetadataSubmit} disabled={createEdition.isPending}>
                {createEdition.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Start Parsing'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Parsing */}
      {step === 'parsing' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-6">
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Analyzing SQF Document...</h3>
                <p className="text-muted-foreground">
                  AI is extracting SQF codes and requirements from your document
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-3">
                {['Uploading document...', 'Extracting text from PDF...', 'Identifying SQF codes...', 'Analyzing requirements...'].map((task) => (
                  <div key={task} className="flex items-center justify-between text-sm">
                    <span>{task}</span>
                    {parsingProgress.completed.includes(task) ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : parsingProgress.current === task ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted" />
                    )}
                  </div>
                ))}
              </div>

              {parsingProgress.current === 'Failed' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Parsing Failed</AlertTitle>
                  <AlertDescription>
                    Unable to extract SQF codes. Please try again or contact support.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 'review' && extractedData && (
        <Card>
          <CardHeader>
            <CardTitle>Extraction Complete</CardTitle>
            <CardDescription>
              Review the extracted SQF codes below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                Successfully extracted <strong>{extractedData.codes_extracted}</strong> SQF codes
                from {extractedData.sections_found} sections.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary">{extractedData.codes_extracted}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Codes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary">{extractedData.sections_found}</div>
                  <div className="text-sm text-muted-foreground mt-1">Sections</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-green-600">100%</div>
                  <div className="text-sm text-muted-foreground mt-1">Parsed</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={handleComplete}>
                View Edition
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
