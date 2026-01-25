import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EmailTemplatePreviewProps {
  companyName: string;
  heading: string;
  bodyText: string;
  buttonText: string;
  footerText: string;
  recipientName?: string;
}

export function EmailTemplatePreview({
  companyName,
  heading,
  bodyText,
  buttonText,
  footerText,
  recipientName = 'John',
}: EmailTemplatePreviewProps) {
  // Replace merge fields with preview values
  const processText = (text: string) => {
    return text
      .replace(/\{\{COMPANY_NAME\}\}/g, companyName)
      .replace(/\{\{FIRST_NAME\}\}/g, recipientName);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Email Preview</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="bg-muted/30 p-4">
          {/* Email preview container */}
          <div className="bg-background rounded-lg border shadow-sm overflow-hidden max-w-[500px] mx-auto">
            {/* Header */}
            <div className="bg-primary p-6 text-center">
              <h1 className="text-primary-foreground text-xl font-bold m-0">
                {companyName}
              </h1>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {processText(heading)}
              </h2>
              
              <p className="text-sm text-foreground/80 leading-relaxed">
                Hi {recipientName},
              </p>
              
              <p className="text-sm text-foreground/80 leading-relaxed">
                {processText(bodyText)}
              </p>
              
              {/* Button */}
              {buttonText && (
                <div className="text-center py-4">
                  <span className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold text-sm">
                    {buttonText}
                  </span>
                </div>
              )}
              
              {/* Fallback link preview */}
              <p className="text-xs text-muted-foreground text-center">
                If the button doesn't work, copy and paste this link:<br />
                <span className="text-primary underline">https://example.com/reset?token=...</span>
              </p>
              
              <p className="text-xs text-muted-foreground">
                {processText(footerText)}
              </p>
              
              <hr className="border-border" />
              
              <p className="text-xs text-muted-foreground text-center">
                This is an automated message from {companyName}.<br />
                Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
