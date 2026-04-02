import { useEffect, useState } from 'react';
import { Volume2, VolumeX, TestTube2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { kitchenSoundService, type SoundSettings as KitchenSoundSettings } from '@/services/soundService';

interface SoundSettingsProps {
  onSettingsChange?: (settings: KitchenSoundSettings) => void;
}

export function SoundSettings({ onSettingsChange }: SoundSettingsProps) {
  const [settings, setSettings] = useState<KitchenSoundSettings>(kitchenSoundService.getSettings());
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    setSettings(kitchenSoundService.getSettings());
  }, []);

  const updateSettings = (patch: Partial<KitchenSoundSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    kitchenSoundService.updateSettings(patch);
    onSettingsChange?.(next);
  };

  const runTest = async (type: Parameters<typeof kitchenSoundService.testSound>[0]) => {
    if (testing) return;
    setTesting(type);
    try {
      await kitchenSoundService.prime();
      await kitchenSoundService.testSound(type);
    } finally {
      window.setTimeout(() => setTesting(null), 600);
    }
  };

  return (
    <div className="w-80 space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Kitchen Sounds</h3>
        <p className="text-xs text-muted-foreground">
          Alerts for new tickets, ready orders, and rush conditions.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Enable sounds</Label>
          <p className="text-xs text-muted-foreground">Requires one user gesture per browser tab.</p>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(checked) => updateSettings({ enabled: checked })}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          {settings.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          Volume {Math.round(settings.volume * 100)}%
        </Label>
        <Slider
          value={[settings.volume]}
          min={0}
          max={1}
          step={0.05}
          disabled={!settings.enabled}
          onValueChange={([volume]) => updateSettings({ volume })}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">New order</Label>
            <p className="text-xs text-muted-foreground">Chime when a fresh ticket appears.</p>
          </div>
          <Switch
            checked={settings.newOrderEnabled}
            disabled={!settings.enabled}
            onCheckedChange={(checked) => updateSettings({ newOrderEnabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Order ready</Label>
            <p className="text-xs text-muted-foreground">Success tone for completed dine-in orders.</p>
          </div>
          <Switch
            checked={settings.orderReadyEnabled}
            disabled={!settings.enabled}
            onCheckedChange={(checked) => updateSettings({ orderReadyEnabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Takeaway ready</Label>
            <p className="text-xs text-muted-foreground">Distinct alert for takeout completion.</p>
          </div>
          <Switch
            checked={settings.takeawayReadyEnabled}
            disabled={!settings.enabled}
            onCheckedChange={(checked) => updateSettings({ takeawayReadyEnabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Rush alert</Label>
            <p className="text-xs text-muted-foreground">Urgent tone when orders exceed the threshold.</p>
          </div>
          <Switch
            checked={settings.rushAlertEnabled}
            disabled={!settings.enabled}
            onCheckedChange={(checked) => updateSettings({ rushAlertEnabled: checked })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Test tones</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!settings.enabled || testing !== null}
            onClick={() => void runTest('new_order')}
          >
            <TestTube2 className="mr-1.5 h-3.5 w-3.5" />
            {testing === 'new_order' ? 'Testing...' : 'New'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!settings.enabled || testing !== null}
            onClick={() => void runTest('order_ready')}
          >
            <TestTube2 className="mr-1.5 h-3.5 w-3.5" />
            {testing === 'order_ready' ? 'Testing...' : 'Ready'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!settings.enabled || testing !== null}
            onClick={() => void runTest('takeaway_ready')}
          >
            <TestTube2 className="mr-1.5 h-3.5 w-3.5" />
            {testing === 'takeaway_ready' ? 'Testing...' : 'Takeout'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!settings.enabled || testing !== null}
            onClick={() => void runTest('rush_alert')}
          >
            <TestTube2 className="mr-1.5 h-3.5 w-3.5" />
            {testing === 'rush_alert' ? 'Testing...' : 'Rush'}
          </Button>
        </div>
      </div>
    </div>
  );
}
