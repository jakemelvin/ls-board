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
  formatDashboardDateParam,
  formatDateRange,
  getDashboardPeriodRange,
  normalizeDateRange,
  parseDashboardDateInput,
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

    const parsed = parseDashboardDateInput(value);
    if (!parsed) {
      return;
    }

    const nextRange = normalizeDateRange({
      ...range,
      [key]: parsed,
    });
    onChange('CUSTOM', nextRange);
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4 xl:w-auto xl:flex-row xl:flex-wrap xl:items-end">
      <div className="min-w-0 xl:w-56 xl:shrink-0">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Periode d'analyse
        </label>
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full bg-secondary">
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

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:w-[300px] xl:shrink-0">
        <div className="min-w-0">
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
        <div className="min-w-0">
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

      <Button
        variant="outline"
        className="w-full min-w-0 justify-start gap-2 px-3 text-left xl:w-[270px] xl:shrink-0"
        disabled
      >
        <CalendarDays className="h-4 w-4 shrink-0" />
        <span className="min-w-0 truncate">{formatDateRange(range)}</span>
      </Button>
    </div>
  );
}

function toDateInputValue(date: Date) {
  return formatDashboardDateParam(date);
}
