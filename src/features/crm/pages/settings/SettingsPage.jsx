import React, { useState, useEffect } from 'react';
import { Sliders, Building, CheckCircle2, Globe, Shield } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { adminService } from '../../services/api';

export const SettingsPage = () => {
  const [settings, setSettings] = useState({
    name: 'Apex Global Sales Cloud',
    domain: 'apexsales.in',
    currency: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    phone: '+91 80 4567 8900',
    email: 'contact@apexsales.in',
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await adminService.getSettings();
        if (res.success && res.data) {
          setSettings(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await adminService.updateSettings(settings);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Organization & Sales Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure default currency, timezone, fiscal calendar, and company profile.
        </p>
      </div>

      <Card padding="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Organization Name"
            value={settings.name || ''}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Work Domain"
              value={settings.domain || ''}
              onChange={(e) => setSettings({ ...settings, domain: e.target.value })}
            />
            <Input
              label="Contact Email"
              value={settings.email || ''}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Default Currency"
              value={settings.currency || 'INR'}
              onChange={(e) => {
                const cur = e.target.value;
                setSettings({
                  ...settings,
                  currency: cur,
                  currencySymbol: cur === 'INR' ? '₹' : '$',
                });
              }}
              options={[
                { value: 'INR', label: 'INR (₹ - Indian Rupee)' },
                { value: 'USD', label: 'USD ($ - US Dollar)' },
              ]}
            />

            <Select
              label="Timezone"
              value={settings.timezone || 'Asia/Kolkata'}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              options={[
                { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
                { value: 'America/New_York', label: 'America/New_York (EST)' },
                { value: 'Europe/London', label: 'Europe/London (GMT)' },
                { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
              ]}
            />

            <Select
              label="Date Format"
              value={settings.dateFormat || 'DD/MM/YYYY'}
              onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              ]}
            />
          </div>

          {isSaved && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Settings updated successfully!</span>
            </div>
          )}

          <div className="pt-3">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
