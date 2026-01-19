import { useState, useEffect } from 'react';
import { MessageSquareWarning, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ComplaintSettings() {
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    auto_capa_for_illness: true,
    auto_capa_for_allergen: true,
    auto_capa_for_foreign_material: true,
    auto_capa_severity: 'critical',
    require_followup_for_critical: true,
    followup_days_default: 7,
    notify_qa_for_critical: true,
    notify_management_for_illness: true,
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save - in real implementation, save to capa_settings table
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('Settings saved');
    setSaving(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquareWarning className="h-6 w-6" />
            Complaint Settings
          </h1>
          <p className="text-muted-foreground">Configure complaint handling rules</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Auto-CAPA Rules</CardTitle>
            <CardDescription>
              Automatically create CAPAs for certain complaint types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Illness/Injury Complaints</Label>
              <Switch
                checked={settings.auto_capa_for_illness}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, auto_capa_for_illness: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Allergen Issues</Label>
              <Switch
                checked={settings.auto_capa_for_allergen}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, auto_capa_for_allergen: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Foreign Material</Label>
              <Switch
                checked={settings.auto_capa_for_foreign_material}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, auto_capa_for_foreign_material: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-CAPA Severity</Label>
              <Select
                value={settings.auto_capa_severity}
                onValueChange={(v) => setSettings((s) => ({ ...s, auto_capa_severity: v }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Follow-up Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Require Follow-up for Critical</Label>
              <Switch
                checked={settings.require_followup_for_critical}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, require_followup_for_critical: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Default Follow-up Days</Label>
              <Input
                type="number"
                value={settings.followup_days_default}
                onChange={(e) => setSettings((s) => ({ ...s, followup_days_default: parseInt(e.target.value) || 7 }))}
                className="w-24"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Notify QA for Critical Complaints</Label>
              <Switch
                checked={settings.notify_qa_for_critical}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, notify_qa_for_critical: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Notify Management for Illness</Label>
              <Switch
                checked={settings.notify_management_for_illness}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, notify_management_for_illness: v }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
