import { useState } from 'react';
import { ClipboardCheck, Save, Loader2 } from 'lucide-react';
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

export default function AuditSettings() {
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    capa_required_for_critical: true,
    capa_required_for_major: true,
    capa_required_for_minor: false,
    response_days_critical: 7,
    response_days_major: 14,
    response_days_minor: 30,
    notify_on_finding: true,
    notify_on_overdue: true,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('Settings saved');
    setSaving(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            Audit Settings
          </h1>
          <p className="text-muted-foreground">Configure audit and finding rules</p>
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
            <CardTitle className="text-base">CAPA Requirements</CardTitle>
            <CardDescription>Auto-require CAPAs for findings by severity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Critical Non-Conformances</Label>
              <Switch
                checked={settings.capa_required_for_critical}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, capa_required_for_critical: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Major Non-Conformances</Label>
              <Switch
                checked={settings.capa_required_for_major}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, capa_required_for_major: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Minor Non-Conformances</Label>
              <Switch
                checked={settings.capa_required_for_minor}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, capa_required_for_minor: v }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Response Deadlines</CardTitle>
            <CardDescription>Days allowed for corrective action response</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Critical Findings</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.response_days_critical}
                  onChange={(e) => setSettings((s) => ({ ...s, response_days_critical: parseInt(e.target.value) || 7 }))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Major Findings</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.response_days_major}
                  onChange={(e) => setSettings((s) => ({ ...s, response_days_major: parseInt(e.target.value) || 14 }))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Minor Findings</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.response_days_minor}
                  onChange={(e) => setSettings((s) => ({ ...s, response_days_minor: parseInt(e.target.value) || 30 }))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Notify on New Finding</Label>
              <Switch
                checked={settings.notify_on_finding}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, notify_on_finding: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Notify on Overdue Response</Label>
              <Switch
                checked={settings.notify_on_overdue}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, notify_on_overdue: v }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
