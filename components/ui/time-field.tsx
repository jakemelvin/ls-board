'use client'

import { useId } from 'react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const UNSET = 'unset'
const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))

type TimeFieldProps = {
  /** `HH:mm`, or an empty string when unset. */
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  id?: string
  'aria-label'?: string
}

/**
 * Time input made of two selects. The native `type="time"` picker overflows its
 * dialog on small Android screens (its buttons are cut off), so it is avoided.
 */
export function TimeField({
  value,
  onChange,
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
}: TimeFieldProps) {
  const { t } = useTranslation('common')
  const [hour = '', minute = ''] = value.split(':')
  // Keep a minute that is not on the 5-minute grid (e.g. coming from the API).
  const minuteOptions = minute && !MINUTES.includes(minute) ? [...MINUTES, minute].sort() : MINUTES

  return (
    <div
      className={cn('grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2', className)}
    >
      <Select
        value={hour || UNSET}
        onValueChange={(next) => onChange(next === UNSET ? '' : `${next}:${minute || '00'}`)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className="w-full bg-secondary"
          aria-label={`${ariaLabel ? `${ariaLabel} — ` : ''}${t('time.hour')}`}
        >
          <SelectValue placeholder={t('time.hour')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET}>—</SelectItem>
          {HOURS.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span aria-hidden="true" className="text-lg font-semibold text-muted-foreground">
        :
      </span>
      <Select
        value={minute || UNSET}
        onValueChange={(next) => onChange(next === UNSET ? '' : `${hour || '00'}:${next}`)}
        disabled={disabled}
      >
        <SelectTrigger
          className="w-full bg-secondary"
          aria-label={`${ariaLabel ? `${ariaLabel} — ` : ''}${t('time.minute')}`}
        >
          <SelectValue placeholder={t('time.minute')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET}>—</SelectItem>
          {minuteOptions.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

type DateTimeFieldProps = {
  /** `YYYY-MM-DDTHH:mm`, or an empty string when unset. */
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
}

/** Replacement for `type="datetime-local"`: a date input plus a {@link TimeField}. */
export function DateTimeField({ value, onChange, id, className }: DateTimeFieldProps) {
  const generatedId = useId()
  const [date = '', time = ''] = value.split('T')

  return (
    <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
      <Input
        id={id ?? generatedId}
        type="date"
        value={date}
        onChange={(event) => {
          const nextDate = event.target.value
          onChange(nextDate ? `${nextDate}T${time || '00:00'}` : '')
        }}
      />
      <TimeField
        value={time.slice(0, 5)}
        disabled={!date}
        onChange={(nextTime) => date && onChange(`${date}T${nextTime || '00:00'}`)}
      />
    </div>
  )
}
