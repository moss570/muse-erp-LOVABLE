import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import { useQASettings, useQASettingsMutation, useQACheckDefinitions } from '@/hooks/useQASettings';
import { usePermission } from '@/hooks/usePermission';
import { Settings, Clock, ListChecks, Workflow, Save, AlertCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import type { QACheckTier, QAEntityType, ConditionalDurationMaterials, ConditionalDurationEntities } from '@/types/qa-checks';

const MATERIAL_CATEGORIES = [
  'Ingredients',
  'Packaging',
  'Boxes',
  'Chemical',
  'Supplies',
  'Maintenance',
  'Direct Sale',
];

const ENTITY_LABELS: Record<string, string> = {
  suppliers: 'Suppliers',
  products: 'Products',
  production_lots: 'Production Lots',
};

const TIER_CONFIG = {
  critical: { label: 'Critical', icon: AlertCircle, color: 'text-destructive', badgeVariant: 'destructive' as const },
  important: { label: 'Important', icon: AlertTriangle, color: 'text-orange-500', badgeVariant: 'default' as const },
  recommended: { label: 'Recommended', icon: Lightbulb, color: 'text-yellow-500', badgeVariant: 'secondary' as const },
};

export default function QAApprovalRules() {
  const { data: settings, isLoading: settingsLoading } = useQASettings();
  const { data: checkDefinitions, isLoading: checksLoading } = useQACheckDefinitions({ activeOnly: false });
  const updateSettings = useQASettingsMutation();
  const { canWrite } = usePermission('qa_settings_manage');

  // Check permissions
  const canEdit = canWrite;
  const isReadOnly = !canEdit;

  // Local state for edits
  const [materialDurations, setMaterialDurations] = useState<ConditionalDurationMaterials>({
    Ingredients: 14,
    Packaging: 30,
    Boxes: 30,
    Chemical: 21,
    Supplies: 45,
    Maintenance: 45,
    'Direct Sale': 14,
  });

  const [entityDurations, setEntityDurations] = useState<ConditionalDurationEntities>({
    suppliers: 30,
    products: 14,
    production_lots: 7,
  });

  const [workQueueDays, setWorkQueueDays] = useState(45);
  const [expiryWarningDays, setExpiryWarningDays] = useState(30);
  const [staleDraftDays, setStaleDraftDays] = useState(30);

  // Filter state for check definitions
  const [tierFilter, setTierFilter] = useState<QACheckTier | 'all'>('all');
  const [entityFilter, setEntityFilter] = useState<QAEntityType | 'all'>('all');
  const [activeOnly, setActiveOnly] = useState(true);

  // Track if changes have been made
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings into local state
  useEffect(() => {
    if (settings) {
      const matDur = settings.find(s => s.setting_key === 'conditional_duration_materials');
      if (matDur?.setting_value) {
        setMaterialDurations(matDur.setting_value as ConditionalDurationMaterials);
      }

      const entDur = settings.find(s => s.setting_key === 'conditional_duration_entities');
      if (entDur?.setting_value) {
        setEntityDurations(entDur.setting_value as ConditionalDurationEntities);
      }

      const wqDays = settings.find(s => s.setting_key === 'work_queue_lookahead_days');
      if (wqDays?.setting_value) {
        setWorkQueueDays(parseInt(String(wqDays.setting_value), 10));
      }

      const expDays = settings.find(s => s.setting_key === 'document_expiry_warning_days');
      if (expDays?.setting_value) {
        setExpiryWarningDays(parseInt(String(expDays.setting_value), 10));
      }

      const staleDays = settings.find(s => s.setting_key === 'stale_draft_threshold_days');
      if (staleDays?.setting_value) {
        setStaleDraftDays(parseInt(String(staleDays.setting_value), 10));
      }
    }
  }, [settings]);

  // Filter check definitions
  const filteredChecks = useMemo(() => {
    if (!checkDefinitions) return [];
    
    return checkDefinitions.filter(check => {
      if (tierFilter !== 'all' && check.tier !== tierFilter) return false;
      if (entityFilter !== 'all' && check.entity_type !== entityFilter) return false;
      if (activeOnly && !check.is_active) return false;
      return true;
    });
  }, [checkDefinitions, tierFilter, entityFilter, activeOnly]);

  const handleMaterialDurationChange = (category: string, value: string) => {
    const numValue = Math.max(1, Math.min(90, parseInt(value, 10) || 1));
    setMaterialDurations(prev => ({ ...prev, [category]: numValue }));
    setHasChanges(true);
  };

  const handleEntityDurationChange = (entity: string, value: string) => {
    const numValue = Math.max(1, Math.min(90, parseInt(value, 10) || 1));
    setEntityDurations(prev => ({ ...prev, [entity]: numValue }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync([
      { setting_key: 'conditional_duration_materials', setting_value: materialDurations },
      { setting_key: 'conditional_duration_entities', setting_value: entityDurations },
      { setting_key: 'work_queue_lookahead_days', setting_value: workQueueDays },
      { setting_key: 'document_expiry_warning_days', setting_value: expiryWarningDays },
      { setting_key: 'stale_draft_threshold_days', setting_value: staleDraftDays },
    ]);
    setHasChanges(false);
  };

  const isLoading = settingsLoading || checksLoading;

  return (
    <div className="space-y-6">
      <SettingsBreadcrumb currentPage="QA Approval Rules" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings className="h-8 w-8" />
            QA Approval Rules
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure approval workflows and check classifications
          </p>
        </div>
        {!isReadOnly && (
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updateSettings.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        )}
      </div>

      {isReadOnly && (
        <div className="bg-muted/50 border rounded-lg p-3 flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          You have read-only access to these settings
        </div>
      )}

      <Tabs defaultValue="durations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="durations" className="gap-2">
            <Clock className="h-4 w-4" />
            Durations
          </TabsTrigger>
          <TabsTrigger value="checks" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Check Definitions
          </TabsTrigger>
          <TabsTrigger value="work-queue" className="gap-2">
            <Workflow className="h-4 w-4" />
            Work Queue
          </TabsTrigger>
        </TabsList>

        {/* Durations Tab */}
        <TabsContent value="durations" className="space-y-6">
          {/* Material Conditional Durations */}
          <Card>
            <CardHeader>
              <CardTitle>Conditional Approval - Materials</CardTitle>
              <CardDescription>
                Days until conditional approval expires by material category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-24">Days</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MATERIAL_CATEGORIES.map(category => (
                    <TableRow key={category}>
                      <TableCell className="font-medium">{category}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          max={90}
                          value={materialDurations[category] || 30}
                          onChange={e => handleMaterialDurationChange(category, e.target.value)}
                          disabled={isReadOnly}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {category === 'Ingredients' || category === 'Direct Sale' 
                          ? 'Food safety - shorter cycle' 
                          : category === 'Chemical'
                          ? 'Cleaning chemicals'
                          : category === 'Supplies' || category === 'Maintenance'
                          ? 'Standard materials'
                          : 'Standard materials'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Entity Conditional Durations */}
          <Card>
            <CardHeader>
              <CardTitle>Conditional Approval - Other Entities</CardTitle>
              <CardDescription>
                Days until conditional approval expires for non-material entities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Type</TableHead>
                    <TableHead className="w-24">Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{label}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          max={90}
                          value={entityDurations[key as keyof ConditionalDurationEntities] || 30}
                          onChange={e => handleEntityDurationChange(key, e.target.value)}
                          disabled={isReadOnly}
                          className="w-20"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Check Definitions Tab */}
        <TabsContent value="checks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QA Check Definitions</CardTitle>
              <CardDescription>
                Configure which checks apply and their severity tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="tier-filter" className="text-sm whitespace-nowrap">Tier:</Label>
                  <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as QACheckTier | 'all')}>
                    <SelectTrigger id="tier-filter" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="recommended">Recommended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="entity-filter" className="text-sm whitespace-nowrap">Entity:</Label>
                  <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v as QAEntityType | 'all')}>
                    <SelectTrigger id="entity-filter" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Entities</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="production_lot">Production Lot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="active-only" 
                    checked={activeOnly} 
                    onCheckedChange={(checked) => setActiveOnly(!!checked)}
                  />
                  <Label htmlFor="active-only" className="text-sm cursor-pointer">Active Only</Label>
                </div>
              </div>

              {/* Check Definitions Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check</TableHead>
                      <TableHead className="w-28">Tier</TableHead>
                      <TableHead className="w-28">Entity</TableHead>
                      <TableHead>Categories</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredChecks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No checks found matching filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredChecks.map(check => {
                        const tierConfig = TIER_CONFIG[check.tier as QACheckTier];
                        const TierIcon = tierConfig.icon;
                        return (
                          <TableRow key={check.id} className={!check.is_active ? 'opacity-50' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TierIcon className={`h-4 w-4 ${tierConfig.color}`} />
                                <div>
                                  <div className="font-medium">{check.check_name}</div>
                                  {check.check_description && (
                                    <div className="text-xs text-muted-foreground">{check.check_description}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={tierConfig.badgeVariant}>
                                {tierConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">{check.entity_type}</TableCell>
                            <TableCell>
                              {check.applicable_categories?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {check.applicable_categories.map(cat => (
                                    <Badge key={cat} variant="outline" className="text-xs">
                                      {cat}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">All</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Queue Tab */}
        <TabsContent value="work-queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Work Queue Settings</CardTitle>
              <CardDescription>
                Configure the QA Work Queue dashboard behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="lookahead">Look-ahead Window (days)</Label>
                  <Input
                    id="lookahead"
                    type="number"
                    min={1}
                    max={90}
                    value={workQueueDays}
                    onChange={e => {
                      setWorkQueueDays(Math.max(1, Math.min(90, parseInt(e.target.value, 10) || 45)));
                      setHasChanges(true);
                    }}
                    disabled={isReadOnly}
                    className="w-24"
                  />
                  <p className="text-xs text-muted-foreground">
                    How far ahead to look for upcoming expirations and reviews
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry-warning">Document Expiry Warning (days)</Label>
                  <Input
                    id="expiry-warning"
                    type="number"
                    min={1}
                    max={90}
                    value={expiryWarningDays}
                    onChange={e => {
                      setExpiryWarningDays(Math.max(1, Math.min(90, parseInt(e.target.value, 10) || 30)));
                      setHasChanges(true);
                    }}
                    disabled={isReadOnly}
                    className="w-24"
                  />
                  <p className="text-xs text-muted-foreground">
                    Days before expiry to show warning badges
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stale-draft">Stale Draft Threshold (days)</Label>
                  <Input
                    id="stale-draft"
                    type="number"
                    min={1}
                    max={90}
                    value={staleDraftDays}
                    onChange={e => {
                      setStaleDraftDays(Math.max(1, Math.min(90, parseInt(e.target.value, 10) || 30)));
                      setHasChanges(true);
                    }}
                    disabled={isReadOnly}
                    className="w-24"
                  />
                  <p className="text-xs text-muted-foreground">
                    Days of inactivity before a draft is flagged as stale
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
