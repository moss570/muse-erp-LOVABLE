# HACCP PLAN MANAGEMENT & TRAINING REGISTER INTEGRATION

## **OVERVIEW**

This document details the integration of HACCP (Hazard Analysis and Critical Control Points) plans with the Manufacturing module and Training Register system.

**Key Features:**
- Upload complete HACCP plans with flowcharts and hazard analysis
- Extract and manage CCPs, CPs, and PCPs
- Real-time verification during manufacturing operations
- Training requirements linked to job positions
- Integration with HR training files

---

## **1. DATABASE SCHEMA**

### **1.1 HACCP Plan Tables**

```sql
-- HACCP plans extend the policies table
-- policies table already has: id, policy_number, title, category, status, content_json, etc.

-- HACCP-specific metadata and structure
CREATE TABLE haccp_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE UNIQUE,

  -- Plan identification
  haccp_plan_number VARCHAR UNIQUE NOT NULL,  -- Auto-generated or custom
  product_scope TEXT[],  -- Products covered by this plan
  process_scope TEXT[],  -- Processes covered

  -- Plan metadata
  haccp_team_leader UUID REFERENCES profiles(id),
  team_members UUID[],  -- Array of profile IDs

  -- Regulatory info
  regulatory_basis TEXT[],  -- ['FDA FSMA', 'SQF', 'GFSI']
  allergens_present TEXT[],  -- ['milk', 'soy', 'wheat', etc.]

  -- Verification schedule
  verification_frequency_days INTEGER DEFAULT 30,
  last_verification_date DATE,
  next_verification_due DATE,

  -- Process flow
  has_process_flow BOOLEAN DEFAULT true,
  process_flow_diagram_url VARCHAR,  -- Link to flowchart image/PDF

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Process flow steps (extracted from flowchart or manually entered)
CREATE TABLE haccp_process_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  haccp_plan_id UUID REFERENCES haccp_plans(id) ON DELETE CASCADE,

  step_number INTEGER NOT NULL,
  step_name VARCHAR NOT NULL,
  step_description TEXT,
  step_type VARCHAR,  -- Receiving, Storage, Processing, Packaging, Shipping, etc.

  -- Visual positioning (for flowchart display)
  position_x INTEGER,
  position_y INTEGER,

  -- Connections
  previous_step_ids UUID[],  -- Array of step IDs (supports branching)
  next_step_ids UUID[],

  -- Associated data
  equipment_used TEXT[],
  typical_duration_minutes INTEGER,
  temperature_range VARCHAR,  -- e.g., "32-40°F"

  created_at TIMESTAMP DEFAULT now(),

  UNIQUE(haccp_plan_id, step_number)
);

-- Hazard Analysis
CREATE TABLE haccp_hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  haccp_plan_id UUID REFERENCES haccp_plans(id) ON DELETE CASCADE,
  process_step_id UUID REFERENCES haccp_process_steps(id) ON DELETE CASCADE,

  -- Hazard identification
  hazard_type VARCHAR NOT NULL,  -- Biological, Chemical, Physical, Allergen, Radiological
  hazard_description TEXT NOT NULL,
  hazard_source TEXT,  -- Where does this hazard come from?

  -- Risk assessment
  severity VARCHAR,  -- Low, Medium, High, Critical
  likelihood VARCHAR,  -- Rare, Unlikely, Possible, Likely, Almost_Certain
  risk_level VARCHAR,  -- Calculated: Low, Medium, High, Extreme

  -- Significance
  is_significant BOOLEAN DEFAULT false,  -- Is this a significant hazard requiring control?
  justification TEXT,  -- Why is/isn't this significant?

  -- Control measures
  control_measures TEXT[],  -- Preventative measures

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_hazard_type CHECK (hazard_type IN ('Biological', 'Chemical', 'Physical', 'Allergen', 'Radiological')),
  CONSTRAINT valid_severity CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  CONSTRAINT valid_likelihood CHECK (likelihood IN ('Rare', 'Unlikely', 'Possible', 'Likely', 'Almost_Certain'))
);

-- Critical Control Points (CCPs)
CREATE TABLE haccp_critical_control_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  haccp_plan_id UUID REFERENCES haccp_plans(id) ON DELETE CASCADE,
  process_step_id UUID REFERENCES haccp_process_steps(id),
  hazard_id UUID REFERENCES haccp_hazards(id),

  -- CCP identification
  ccp_number VARCHAR NOT NULL,  -- e.g., "CCP-1", "CCP-2A"
  ccp_type VARCHAR DEFAULT 'CCP',  -- CCP, CP (Control Point), PCP (Preventative Control Point)
  ccp_name VARCHAR NOT NULL,
  description TEXT,

  -- Critical limits
  critical_limit_parameter VARCHAR,  -- Temperature, Time, pH, Water Activity, etc.
  critical_limit_value VARCHAR,  -- e.g., "165°F minimum", "pH < 4.6"
  critical_limit_min DECIMAL(10,2),  -- For numerical limits
  critical_limit_max DECIMAL(10,2),
  unit_of_measure VARCHAR,  -- °F, minutes, pH, aw

  -- Monitoring
  monitoring_procedure TEXT NOT NULL,
  monitoring_frequency VARCHAR,  -- Per batch, Every hour, Continuous, etc.
  monitoring_method VARCHAR,  -- Thermometer, pH meter, Visual, etc.

  -- Responsible party
  responsible_position VARCHAR,  -- Job position, not individual
  responsible_employee_id UUID REFERENCES profiles(id),  -- Can assign specific person

  -- Corrective actions
  corrective_action_procedure TEXT NOT NULL,
  corrective_action_examples TEXT[],

  -- Verification
  verification_procedure TEXT,
  verification_frequency VARCHAR,
  verification_responsible VARCHAR,

  -- Record keeping
  record_form_id UUID,  -- Link to form/template
  record_retention_months INTEGER DEFAULT 24,

  -- Manufacturing integration
  requires_manufacturing_verification BOOLEAN DEFAULT true,
  linked_production_step VARCHAR,  -- Link to manufacturing workflow step

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_ccp_type CHECK (ccp_type IN ('CCP', 'CP', 'PCP')),
  UNIQUE(haccp_plan_id, ccp_number)
);

-- CCP Verification Records (generated during production)
CREATE TABLE haccp_ccp_verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ccp_id UUID REFERENCES haccp_critical_control_points(id) ON DELETE CASCADE,
  haccp_plan_id UUID REFERENCES haccp_plans(id),

  -- Link to production
  production_lot_id UUID,  -- Link to manufacturing production_lots table
  production_run_id UUID,
  work_order_id UUID,

  -- Verification details
  verified_at TIMESTAMP DEFAULT now(),
  verified_by UUID REFERENCES profiles(id),

  -- Measurement
  parameter_measured VARCHAR,
  measured_value DECIMAL(10,2),
  unit_of_measure VARCHAR,

  -- Status
  is_within_limits BOOLEAN,
  deviation_detected BOOLEAN DEFAULT false,

  -- Corrective action (if needed)
  corrective_action_taken TEXT,
  corrective_action_by UUID REFERENCES profiles(id),
  corrective_action_at TIMESTAMP,

  -- Documentation
  notes TEXT,
  photo_urls TEXT[],

  created_at TIMESTAMP DEFAULT now()
);

-- CCP Deviations and Non-Conformances
CREATE TABLE haccp_ccp_deviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ccp_id UUID REFERENCES haccp_critical_control_points(id),
  verification_record_id UUID REFERENCES haccp_ccp_verification_records(id),
  haccp_plan_id UUID REFERENCES haccp_plans(id),

  -- Deviation details
  deviation_date TIMESTAMP NOT NULL,
  detected_by UUID REFERENCES profiles(id),

  -- What happened
  deviation_description TEXT NOT NULL,
  affected_product_quantity DECIMAL(10,2),
  affected_product_unit VARCHAR,
  affected_lot_numbers TEXT[],

  -- Root cause
  root_cause TEXT,
  root_cause_category VARCHAR,  -- Equipment failure, Human error, Raw material, etc.

  -- Corrective action
  immediate_action TEXT NOT NULL,
  corrective_action TEXT NOT NULL,
  preventive_action TEXT,

  action_taken_by UUID REFERENCES profiles(id),
  action_completed_at TIMESTAMP,

  -- Product disposition
  product_disposition VARCHAR,  -- Released, Rework, Reject, Hold
  disposition_justification TEXT,
  disposition_approved_by UUID REFERENCES profiles(id),

  -- Follow-up
  requires_haccp_plan_revision BOOLEAN DEFAULT false,
  requires_training BOOLEAN DEFAULT false,

  status VARCHAR DEFAULT 'Open',  -- Open, Under_Investigation, Resolved, Closed
  closed_at TIMESTAMP,
  closed_by UUID REFERENCES profiles(id),

  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_disposition CHECK (product_disposition IN ('Released', 'Rework', 'Reject', 'Hold', NULL)),
  CONSTRAINT valid_status CHECK (status IN ('Open', 'Under_Investigation', 'Resolved', 'Closed'))
);

-- HACCP Plan Validation Records
CREATE TABLE haccp_plan_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  haccp_plan_id UUID REFERENCES haccp_plans(id) ON DELETE CASCADE,

  validation_date DATE NOT NULL,
  validation_type VARCHAR,  -- Initial, Annual, Revalidation, Change-Triggered

  -- Validation team
  lead_validator UUID REFERENCES profiles(id),
  validation_team UUID[],

  -- Validation scope
  scope_description TEXT,
  changes_since_last_validation TEXT,

  -- Findings
  findings TEXT,
  ccps_validated BOOLEAN DEFAULT true,
  critical_limits_validated BOOLEAN DEFAULT true,
  monitoring_procedures_validated BOOLEAN DEFAULT true,
  corrective_actions_validated BOOLEAN DEFAULT true,
  verification_procedures_validated BOOLEAN DEFAULT true,

  -- Overall result
  validation_status VARCHAR,  -- Passed, Failed, Passed_With_Observations
  observations TEXT[],

  -- Required actions
  action_items TEXT[],
  action_items_completed BOOLEAN DEFAULT false,

  -- Documentation
  validation_report_url VARCHAR,

  next_validation_due DATE,

  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_validation_type CHECK (validation_type IN ('Initial', 'Annual', 'Revalidation', 'Change-Triggered')),
  CONSTRAINT valid_validation_status CHECK (validation_status IN ('Passed', 'Failed', 'Passed_With_Observations'))
);
```

---

### **1.2 Training Register Tables**

```sql
-- Training requirements at document level
CREATE TABLE policy_training_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,

  -- Training details
  training_required BOOLEAN DEFAULT false,
  training_name VARCHAR,
  training_description TEXT,

  -- Who needs this training
  required_for_job_positions VARCHAR[],  -- Array of job position names
  required_for_departments VARCHAR[],
  required_for_all_employees BOOLEAN DEFAULT false,

  -- Training specifications
  training_type VARCHAR,  -- Initial, Refresher, Annual, Change-Triggered
  training_method VARCHAR[],  -- Classroom, Online, On-the-job, Video, etc.
  training_duration_minutes INTEGER,

  -- Frequency
  initial_training_required BOOLEAN DEFAULT true,
  refresher_frequency_months INTEGER,  -- null = one-time only

  -- Assessment
  requires_quiz BOOLEAN DEFAULT false,
  minimum_passing_score INTEGER,  -- Percentage
  quiz_questions JSONB,  -- Array of questions with answers

  -- Trainer requirements
  must_be_trained_by VARCHAR,  -- Job position of trainer
  can_be_self_administered BOOLEAN DEFAULT false,

  -- Resources
  training_materials_urls TEXT[],
  training_video_url VARCHAR,
  training_presentation_url VARCHAR,

  -- Tracking
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_training_type CHECK (training_type IN ('Initial', 'Refresher', 'Annual', 'Change-Triggered'))
);

-- Employee training records (linked to existing HR training system)
CREATE TABLE employee_policy_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  training_requirement_id UUID REFERENCES policy_training_requirements(id),

  -- Training session details
  training_date DATE NOT NULL,
  training_type VARCHAR,  -- Initial, Refresher

  -- Delivery
  training_method VARCHAR,  -- Classroom, Online, etc.
  trainer_id UUID REFERENCES profiles(id),
  training_duration_minutes INTEGER,

  -- Assessment
  quiz_taken BOOLEAN DEFAULT false,
  quiz_score DECIMAL(5,2),  -- Percentage
  quiz_passed BOOLEAN,
  quiz_attempts INTEGER DEFAULT 0,
  quiz_responses JSONB,  -- Store answers for record

  -- Completion
  completed BOOLEAN DEFAULT false,
  completion_date DATE,

  -- Certificate/acknowledgement
  certificate_issued BOOLEAN DEFAULT false,
  certificate_url VARCHAR,
  acknowledgement_signature VARCHAR,  -- Digital signature or typed name
  acknowledgement_timestamp TIMESTAMP,

  -- Expiration (for refresher training)
  expires_at DATE,
  is_current BOOLEAN DEFAULT true,  -- False when expired or superseded

  -- Notes
  notes TEXT,
  training_location VARCHAR,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_training_type CHECK (training_type IN ('Initial', 'Refresher', 'Annual', 'Change-Triggered'))
);

-- Training compliance tracking (view)
CREATE VIEW employee_training_compliance AS
SELECT
  e.id as employee_id,
  e.first_name,
  e.last_name,
  jp.title as job_position,
  p.id as policy_id,
  p.policy_number,
  p.title as policy_title,
  ptr.training_name,
  ptr.refresher_frequency_months,
  ept.training_date,
  ept.expires_at,
  ept.is_current,
  CASE
    WHEN ept.id IS NULL THEN 'Not_Trained'
    WHEN ept.expires_at < CURRENT_DATE THEN 'Expired'
    WHEN ept.expires_at < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring_Soon'
    WHEN ept.is_current = true THEN 'Current'
    ELSE 'Unknown'
  END as compliance_status
FROM profiles e
LEFT JOIN job_positions jp ON e.current_position_id = jp.id
LEFT JOIN policy_training_requirements ptr ON
  (e.current_position_id = ANY(ptr.required_for_job_positions) OR ptr.required_for_all_employees = true)
LEFT JOIN policies p ON ptr.policy_id = p.id
LEFT JOIN employee_policy_training ept ON
  ept.employee_id = e.id AND
  ept.policy_id = p.id AND
  ept.is_current = true
WHERE ptr.is_active = true;

-- Training matrix (who needs what)
CREATE TABLE training_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_position_id UUID REFERENCES job_positions(id),
  department_id UUID REFERENCES departments(id),

  -- Required policies/SOPs
  required_policies UUID[],  -- Array of policy IDs

  -- Summary
  total_training_hours DECIMAL(5,2),
  training_completion_requirement VARCHAR,  -- All_Required, 80_Percent, etc.

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Training reminders/notifications
CREATE TABLE training_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id),
  training_requirement_id UUID REFERENCES policy_training_requirements(id),

  reminder_type VARCHAR,  -- Initial_Training, Refresher_Due, Expiring_Soon, Overdue

  due_date DATE,
  reminder_sent_at TIMESTAMP,

  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP,

  completed BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_reminder_type CHECK (reminder_type IN ('Initial_Training', 'Refresher_Due', 'Expiring_Soon', 'Overdue'))
);
```

---

## **2. HACCP UPLOAD & PARSING WORKFLOW**

### **2.1 Upload Interface**

```tsx
// Page: /pages/policies/HACCPUpload.tsx
function HACCPUploadWizard() {
  const [step, setStep] = useState<'upload' | 'metadata' | 'parsing' | 'review'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Upload HACCP Plan</h1>

      {/* Step Indicator */}
      <StepIndicator currentStep={step} />

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload HACCP Plan Document</CardTitle>
            <CardDescription>
              Upload your complete HACCP plan including process flow diagrams and hazard analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* File upload */}
              <div className="border-2 border-dashed rounded-lg p-12 text-center">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="haccp-upload"
                />
                <label htmlFor="haccp-upload" className="cursor-pointer">
                  <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium">Upload HACCP Plan</p>
                  <p className="text-sm text-gray-500 mt-1">
                    PDF or Word document (max 50MB)
                  </p>
                </label>
              </div>

              {/* Upload options */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setUploadType('complete')}>
                  <CardContent className="pt-6">
                    <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                    <h3 className="font-semibold">Complete HACCP Plan</h3>
                    <p className="text-sm text-gray-600">
                      Upload full plan - AI will extract CCPs, hazards, and process flow
                    </p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setUploadType('manual')}>
                  <CardContent className="pt-6">
                    <Edit className="h-8 w-8 text-blue-600 mb-2" />
                    <h3 className="font-semibold">Manual Entry</h3>
                    <p className="text-sm text-gray-600">
                      Create HACCP plan from scratch using our guided forms
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Metadata */}
      {step === 'metadata' && (
        <HACCPMetadataForm onNext={(data) => handleMetadataComplete(data)} />
      )}

      {/* Step 3: AI Parsing */}
      {step === 'parsing' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <RefreshCw className="h-16 w-16 mx-auto text-blue-600 animate-spin" />
              <h3 className="text-xl font-semibold">Analyzing HACCP Plan...</h3>
              <p className="text-gray-600">
                AI is extracting process steps, hazards, and CCPs from your document
              </p>

              <div className="max-w-md mx-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Extracting text...</span>
                  <span className="text-green-600">✓ Complete</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Identifying process flow...</span>
                  <span className="text-blue-600">⏳ In progress</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Analyzing hazards...</span>
                  <span className="text-gray-400">Pending</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Extracting CCPs...</span>
                  <span className="text-gray-400">Pending</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review Extracted Data */}
      {step === 'review' && extractedData && (
        <HACCPReviewPanel
          data={extractedData}
          onApprove={handleCreateHACCP}
          onEdit={handleEditExtracted}
        />
      )}
    </div>
  );
}
```

### **2.2 AI Parsing Edge Function**

```typescript
// supabase/functions/parse-haccp-document/index.ts
serve(async (req) => {
  const { file_url, haccp_plan_id } = await req.json();

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  // Download document
  const fileData = await fetchDocument(file_url);
  const base64 = convertToBase64(fileData);

  // AI Prompt for HACCP extraction
  const prompt = `You are an expert food safety professional analyzing a HACCP (Hazard Analysis and Critical Control Points) plan.

Extract ALL of the following information from this HACCP plan document:

1. **Process Flow Steps**: List all process steps in order (e.g., Receiving, Storage, Preparation, Cooking, Cooling, Packaging, Shipping)

2. **Hazard Analysis**: For each process step, identify:
   - Hazard type (Biological, Chemical, Physical, Allergen)
   - Hazard description
   - Severity (Low, Medium, High, Critical)
   - Likelihood (Rare, Unlikely, Possible, Likely, Almost_Certain)
   - Is it significant? (Yes/No)
   - Control measures

3. **Critical Control Points (CCPs)**: Extract all CCPs with:
   - CCP number (e.g., CCP-1, CCP-2A)
   - CCP name
   - Process step where it occurs
   - Hazard being controlled
   - Critical limit (e.g., "165°F minimum", "pH < 4.6")
   - Monitoring procedure
   - Monitoring frequency
   - Corrective actions
   - Verification procedure
   - Record keeping requirements

4. **Control Points (CPs)** and **Preventative Control Points (PCPs)** if mentioned

5. **HACCP Team**: Members and their roles

6. **Product Scope**: What products does this plan cover?

Return ONLY valid JSON with this schema:
{
  "product_scope": string[],
  "process_scope": string[],
  "allergens_present": string[],
  "team_members": [{ "name": string, "role": string }],
  "process_steps": [
    {
      "step_number": number,
      "step_name": string,
      "description": string,
      "step_type": string
    }
  ],
  "hazards": [
    {
      "process_step_number": number,
      "hazard_type": "Biological" | "Chemical" | "Physical" | "Allergen",
      "description": string,
      "severity": "Low" | "Medium" | "High" | "Critical",
      "likelihood": "Rare" | "Unlikely" | "Possible" | "Likely" | "Almost_Certain",
      "is_significant": boolean,
      "control_measures": string[]
    }
  ],
  "ccps": [
    {
      "ccp_number": string,
      "ccp_name": string,
      "process_step_number": number,
      "hazard_controlled": string,
      "critical_limit": string,
      "critical_limit_min": number | null,
      "critical_limit_max": number | null,
      "unit": string,
      "monitoring_procedure": string,
      "monitoring_frequency": string,
      "corrective_actions": string,
      "verification": string
    }
  ],
  "cps": [...],  // Same structure as CCPs
  "pcps": [...]   // Same structure as CCPs
}`;

  // Call Lovable AI
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64}` } }
          ]
        }
      ],
      max_tokens: 100000,
      temperature: 0,
      response_format: { type: 'json_object' }
    })
  });

  const aiResponse = await response.json();
  const extractedData = JSON.parse(aiResponse.choices[0].message.content);

  // Save to database
  await saveHACCPExtractedData(haccp_plan_id, extractedData);

  return new Response(JSON.stringify({ success: true, data: extractedData }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## **3. MANUFACTURING INTEGRATION**

### **3.1 CCP Verification in Production**

```tsx
// Component: Production workflow with CCP checks
function ProductionRunCCPChecklist({ productionLotId, workOrderId }) {
  const { data: haccpPlan } = useHACCPPlanForProduct(productId);
  const { data: ccps } = useActiveCCPs(haccpPlan?.id);
  const { mutate: recordVerification } = useRecordCCPVerification();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-600" />
          HACCP Critical Control Points
        </CardTitle>
        <CardDescription>
          Required verifications for this production run
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {ccps?.map(ccp => (
            <CCPVerificationCard
              key={ccp.id}
              ccp={ccp}
              productionLotId={productionLotId}
              onVerify={(data) => recordVerification({ ...data, ccp_id: ccp.id })}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CCPVerificationCard({ ccp, productionLotId, onVerify }) {
  const [measured, setMeasured] = useState('');
  const [isWithinLimits, setIsWithinLimits] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);

  const handleVerify = () => {
    const measuredValue = parseFloat(measured);
    const withinLimits =
      (!ccp.critical_limit_min || measuredValue >= ccp.critical_limit_min) &&
      (!ccp.critical_limit_max || measuredValue <= ccp.critical_limit_max);

    setIsWithinLimits(withinLimits);

    if (!withinLimits) {
      // Trigger deviation workflow
      openDeviationDialog();
    } else {
      onVerify({
        production_lot_id: productionLotId,
        measured_value: measuredValue,
        is_within_limits: withinLimits
      });
    }
  };

  return (
    <Card className={cn(
      "border-2",
      isWithinLimits === true && "border-green-500",
      isWithinLimits === false && "border-red-500"
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              {ccp.ccp_number}: {ccp.ccp_name}
            </CardTitle>
            <CardDescription>{ccp.description}</CardDescription>
          </div>
          <Badge variant={ccp.ccp_type === 'CCP' ? 'destructive' : 'warning'}>
            {ccp.ccp_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical Limit Display */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Critical Limit</AlertTitle>
          <AlertDescription className="font-mono text-lg">
            {ccp.critical_limit_value}
          </AlertDescription>
        </Alert>

        {/* Measurement Input */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Measured Value *</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                value={measured}
                onChange={(e) => setMeasured(e.target.value)}
                placeholder="Enter value"
              />
              <span className="flex items-center px-3 bg-gray-100 rounded">
                {ccp.unit_of_measure}
              </span>
            </div>
          </div>

          <div>
            <Label>Monitoring Method</Label>
            <p className="text-sm text-gray-600 mt-2">{ccp.monitoring_method}</p>
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <Label>Verification Photo (Optional)</Label>
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhotos(Array.from(e.target.files || []))}
          />
        </div>

        {/* Monitoring Procedure */}
        <Collapsible>
          <CollapsibleTrigger className="text-sm text-blue-600 hover:underline">
            View Monitoring Procedure
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-3 bg-gray-50 rounded text-sm">
            {ccp.monitoring_procedure}
          </CollapsibleContent>
        </Collapsible>

        {/* Verify Button */}
        <Button
          onClick={handleVerify}
          disabled={!measured}
          className="w-full"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Record Verification
        </Button>

        {/* Out of Limit Warning */}
        {isWithinLimits === false && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Limit Exceeded!</AlertTitle>
            <AlertDescription>
              Corrective action required: {ccp.corrective_action_procedure}
            </AlertDescription>
            <Button variant="outline" className="mt-2" onClick={openDeviationDialog}>
              Document Corrective Action
            </Button>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

### **3.2 Production Dashboard Integration**

```tsx
// Add to Manufacturing dashboard
function HACCPComplianceWidget() {
  const { data: todayVerifications } = useTodayCCPVerifications();
  const { data: openDeviations } = useOpenHACCPDeviations();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          HACCP Compliance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="text-3xl font-bold text-green-600">
                {todayVerifications?.completed || 0}
              </div>
              <div className="text-sm text-gray-600">CCP Checks Today</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded">
              <div className="text-3xl font-bold text-red-600">
                {openDeviations?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Open Deviations</div>
            </div>
          </div>

          {openDeviations?.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                {openDeviations.length} HACCP deviation(s) require immediate attention
              </AlertDescription>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link to="/quality/haccp-deviations">View Deviations</Link>
              </Button>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## **4. TRAINING REGISTER SYSTEM**

### **4.1 Policy Training Requirements**

```tsx
// Component: Add training requirements to policy
function PolicyTrainingRequirementsPanel({ policyId }) {
  const { data: requirements } = usePolicyTrainingRequirements(policyId);
  const { data: jobPositions } = useJobPositions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Requirements</CardTitle>
        <CardDescription>
          Define who needs training on this policy and how often
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable Training */}
        <div className="flex items-center space-x-2">
          <Switch
            checked={requirements?.training_required}
            onCheckedChange={handleToggleTraining}
          />
          <Label>This policy requires employee training</Label>
        </div>

        {requirements?.training_required && (
          <>
            {/* Training Name */}
            <div>
              <Label>Training Name</Label>
              <Input
                value={requirements.training_name}
                onChange={(e) => updateRequirement('training_name', e.target.value)}
                placeholder="e.g., HACCP Fundamentals Training"
              />
            </div>

            {/* Who Needs Training */}
            <div>
              <Label>Required For</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={requirements.required_for_all_employees}
                    onCheckedChange={(checked) => updateRequirement('required_for_all_employees', checked)}
                  />
                  <Label>All Employees</Label>
                </div>

                {!requirements.required_for_all_employees && (
                  <MultiSelect
                    options={jobPositions}
                    value={requirements.required_for_job_positions}
                    onChange={(selected) => updateRequirement('required_for_job_positions', selected)}
                    placeholder="Select job positions..."
                  />
                )}
              </div>
            </div>

            {/* Training Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Training Type</Label>
                <Select
                  value={requirements.training_type}
                  onValueChange={(val) => updateRequirement('training_type', val)}
                >
                  <SelectItem value="Initial">Initial (one-time)</SelectItem>
                  <SelectItem value="Refresher">Refresher (periodic)</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                </Select>
              </div>

              {requirements.training_type === 'Refresher' && (
                <div>
                  <Label>Refresher Frequency</Label>
                  <Select
                    value={requirements.refresher_frequency_months?.toString()}
                    onValueChange={(val) => updateRequirement('refresher_frequency_months', parseInt(val))}
                  >
                    <SelectItem value="3">Every 3 months</SelectItem>
                    <SelectItem value="6">Every 6 months</SelectItem>
                    <SelectItem value="12">Annually</SelectItem>
                    <SelectItem value="24">Every 2 years</SelectItem>
                  </Select>
                </div>
              )}
            </div>

            {/* Quiz/Assessment */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={requirements.requires_quiz}
                  onCheckedChange={(checked) => updateRequirement('requires_quiz', checked)}
                />
                <Label>Require quiz/assessment</Label>
              </div>

              {requirements.requires_quiz && (
                <div>
                  <Label>Minimum Passing Score (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={requirements.minimum_passing_score}
                    onChange={(e) => updateRequirement('minimum_passing_score', parseInt(e.target.value))}
                  />
                </div>
              )}
            </div>

            {/* Training Materials */}
            <div>
              <Label>Training Materials</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept=".pdf,.pptx,.mp4"
                  onChange={handleUploadMaterial}
                />
                {requirements.training_materials_urls?.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <FileText className="h-4 w-4" />
                    <a href={url} target="_blank" className="text-sm text-blue-600 hover:underline flex-1">
                      {url.split('/').pop()}
                    </a>
                    <Button size="sm" variant="ghost" onClick={() => removeMaterial(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

### **4.2 Employee Training Dashboard**

```tsx
// Page: Employee training portal
function MyTrainingDashboard() {
  const { user } = useAuth();
  const { data: requiredTraining } = useEmployeeRequiredTraining(user.id);
  const { data: completedTraining } = useEmployeeCompletedTraining(user.id);
  const { data: upcomingRefreshers } = useUpcomingRefresherTraining(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Training</h1>
        <p className="text-gray-600">Required policy and procedure training</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Required"
          value={requiredTraining?.length || 0}
          icon={<FileText />}
        />
        <StatCard
          label="Completed"
          value={completedTraining?.length || 0}
          icon={<CheckCircle />}
          variant="success"
        />
        <StatCard
          label="In Progress"
          value={requiredTraining?.filter(t => t.status === 'in_progress').length || 0}
          icon={<Clock />}
          variant="warning"
        />
        <StatCard
          label="Overdue"
          value={requiredTraining?.filter(t => t.status === 'overdue').length || 0}
          icon={<AlertTriangle />}
          variant="destructive"
        />
      </div>

      {/* Required Training List */}
      <Card>
        <CardHeader>
          <CardTitle>Required Training</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requiredTraining?.map(training => (
              <TrainingCard
                key={training.id}
                training={training}
                onStart={() => startTraining(training.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Refreshers */}
      {upcomingRefreshers?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Refresher Training</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingRefreshers.map(refresher => (
                <div key={refresher.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{refresher.training_name}</p>
                    <p className="text-sm text-gray-600">Due: {format(refresher.due_date, 'PP')}</p>
                  </div>
                  <Button size="sm">Start Refresher</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TrainingCard({ training, onStart }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{training.training_name}</h3>
              {training.status === 'overdue' && (
                <Badge variant="destructive">Overdue</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{training.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {training.duration_minutes} minutes
              </span>
              {training.requires_quiz && (
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Quiz required ({training.minimum_passing_score}% to pass)
                </span>
              )}
            </div>
          </div>
          <Button onClick={onStart}>
            Start Training
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### **4.3 Training Compliance Report**

```tsx
// Page: Manager view - training compliance
function TrainingComplianceReport() {
  const { data: compliance } = useTrainingComplianceReport();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training Compliance</h1>
          <p className="text-gray-600">Employee training status across all policies</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Overall Compliance */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Overall Compliance"
          value={`${compliance?.overall_percentage || 0}%`}
          icon={<TrendingUp />}
        />
        <StatCard
          label="Current"
          value={compliance?.current_count || 0}
          icon={<CheckCircle />}
          variant="success"
        />
        <StatCard
          label="Expiring Soon"
          value={compliance?.expiring_soon_count || 0}
          icon={<Clock />}
          variant="warning"
        />
        <StatCard
          label="Expired/Overdue"
          value={compliance?.expired_count || 0}
          icon={<AlertTriangle />}
          variant="destructive"
        />
      </div>

      {/* Compliance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Training Status by Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: 'Policy', accessor: 'policy_title' },
              { header: 'Required For', accessor: 'required_positions' },
              { header: 'Total Employees', accessor: 'total_employees' },
              { header: 'Current', accessor: 'current_count' },
              { header: 'Expired', accessor: 'expired_count' },
              { header: 'Not Trained', accessor: 'not_trained_count' },
              { header: 'Compliance %', accessor: 'compliance_percentage' }
            ]}
            data={compliance?.by_policy || []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## **5. KEY INTEGRATION POINTS**

### **5.1 Policy → HACCP → Manufacturing Flow**

```
┌──────────────┐
│ Upload HACCP │
│ Plan (PDF)   │
└──────┬───────┘
       │
       ↓ AI Parsing
┌──────────────────────────────┐
│ Extract:                     │
│ • Process steps              │
│ • Hazards                    │
│ • CCPs/CPs/PCPs              │
│ • Critical limits            │
└──────┬───────────────────────┘
       │
       ↓ Save to database
┌──────────────────────────────┐
│ HACCP Plan Record            │
│ + CCPs stored                │
└──────┬───────────────────────┘
       │
       ↓ Link to products
┌──────────────────────────────┐
│ Production Work Order        │
│ triggers CCP checklist       │
└──────┬───────────────────────┘
       │
       ↓ During production
┌──────────────────────────────┐
│ Employee verifies each CCP   │
│ • Measure value              │
│ • Check against limit        │
│ • Take photo                 │
│ • Record in system           │
└──────┬───────────────────────┘
       │
       ↓ If deviation
┌──────────────────────────────┐
│ Corrective Action Workflow   │
│ • Document issue             │
│ • Take immediate action      │
│ • Determine product fate     │
│ • Record root cause          │
└──────────────────────────────┘
```

### **5.2 Policy → Training → HR Flow**

```
┌──────────────────────────────┐
│ Create/Update Policy         │
│ + Add training requirements  │
└──────┬───────────────────────┘
       │
       ↓ Define requirements
┌──────────────────────────────┐
│ Training Requirements:       │
│ • Required for: Line Workers │
│ • Frequency: Annual          │
│ • Quiz: Yes (80% to pass)    │
└──────┬───────────────────────┘
       │
       ↓ Auto-assign
┌──────────────────────────────┐
│ System identifies employees  │
│ in "Line Worker" position    │
└──────┬───────────────────────┘
       │
       ↓ Create assignments
┌──────────────────────────────┐
│ Training assignments created │
│ in employee training queue   │
└──────┬───────────────────────┘
       │
       ↓ Notifications
┌──────────────────────────────┐
│ Employees notified of        │
│ required training            │
└──────┬───────────────────────┘
       │
       ↓ Employee completes
┌──────────────────────────────┐
│ • View training materials    │
│ • Take quiz                  │
│ • Sign acknowledgement       │
└──────┬───────────────────────┘
       │
       ↓ Record saved
┌──────────────────────────────┐
│ Training record in HR file   │
│ • Linked to policy           │
│ • Certificate generated      │
│ • Expiration date set        │
└──────────────────────────────┘
```

---

## **SUMMARY**

This integrated system provides:

✅ **HACCP Plan Management:**
- Upload complete plans (PDF/Word)
- AI extracts process flow, hazards, CCPs
- Structured database for all HACCP elements
- CCP/CP/PCP categorization
- Hazard analysis tracking

✅ **Manufacturing Integration:**
- CCPs automatically appear in production workflow
- Real-time verification during production
- Photo documentation
- Deviation tracking with corrective actions
- Product disposition management

✅ **Training Register:**
- Policy-level training requirements
- Auto-assignment based on job position
- Quiz/assessment system
- Linked to HR training files
- Compliance tracking and reporting
- Automatic expiration/refresher reminders

✅ **Compliance Tracking:**
- Training compliance dashboards
- HACCP verification reports
- Deviation trending
- Audit-ready documentation

This creates a complete food safety management system integrated into daily operations!
