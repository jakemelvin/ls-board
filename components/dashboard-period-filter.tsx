'use client';

import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DASHBOARD_PERIOD_LABELS,
  formatDateRange,
  getDashboardPeriodRange,
  normalizeDateRange,
  type DashboardPeriodPreset,
  type DateRange,
} from '@/lib/dashboard-period';

const presets: DashboardPeriodPreset[] = [
  'TODAY',
  'LAST_7_DAYS',
  'CURRENT_MONTH',
  'PREVIOUS_MONTH',
  'CURRENT_YEAR',
  'CUSTOM',
];

interface DashboardPeriodFilterProps {
  preset: DashboardPeriodPreset;
  range: DateRange;
  referenceDate?: Date;
  onChange: (preset: DashboardPeriodPreset, range: DateRange) => void;
}

export function DashboardPeriodFilter({ preset, range, referenceDate, onChange }: DashboardPeriodFilterProps) {
  const handlePresetChange = (value: DashboardPeriodPreset) => {
    if (value === 'CUSTOM') {
      onChange(value, range);
      return;
    }

    onChange(value, getDashboardPeriodRange(value, referenceDate));
  };

  const handleDateChange = (key: keyof DateRange, value: string) => {
    if (!value) {
      return;
    }

    const nextRange = normalizeDateRange({
      ...range,
      [key]: new Date(`${value}T00:00:00`),
    });
    onChange('CUSTOM', nextRange);
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4 lg:w-auto lg:flex-row lg:items-end">
      <div className="min-w-0 lg:min-w-56">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Periode d'analyse
        </label>
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="bg-secondary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presets.map((item) => (
              <SelectItem key={item} value={item}>
                {DASHBOARD_PERIOD_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Du
          </label>
          <Input
            type="date"
            value={toDateInputValue(range.from)}
            onChange={(event) => handleDateChange('from', event.target.value)}
            className="bg-secondary"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Au
          </label>
          <Input
            type="date"
            value={toDateInputValue(range.to)}
            onChange={(event) => handleDateChange('to', event.target.value)}
            className="bg-secondary"
          />
        </div>
      </div>

      <Button variant="outline" className="min-w-0 gap-2 whitespace-normal text-left lg:ml-auto" disabled>
        <CalendarDays className="h-4 w-4" />
        {formatDateRange(range)}
      </Button>
    </div>
  );
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
