'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Megaphone,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  RotateCcw,
  PowerOff,
  Power,
  Calendar,
  MapPin,
  Truck,
  Package,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth/store';
import { getCompanies } from '@/lib/admin/api';
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  renewAnnouncement,
  activateAnnouncement,
  deactivateAnnouncement,
  getCompanyCollectionPoints,
  getCompanyTransportModes,
  getCompanyParcelTypes,
} from '@/lib/announcements/api';
import type {
  AnnouncementResponse,
  AnnouncementRequest,
  AnnouncementRenewRequest,
  CollectionPointOption,
  TransportModeOption,
  ParcelTypeOption,
} from '@/lib/announcements/types';

// ─── Toast ───────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastCounter = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return { toasts, show };
}

function ToastBar({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg',
            t.type === 'success'
              ? 'border-green-800 bg-green-950 text-green-300'
              : 'border-red-800 bg-red-950 text-red-300',
          )}
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  variant = 'default',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Annuler
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
              variant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Select Field ─────────────────────────────────────────────────────────────

interface SelectOption { value: string; label: string }

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

function SelectField({ label, value, onChange, options, placeholder, error, disabled }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full appearance-none rounded-xl border bg-input px-3 py-2.5 pr-9 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50',
            error ? 'border-red-600 focus:ring-red-600' : 'border-border',
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Announcement Form Dialog ─────────────────────────────────────────────────

interface FormState {
  collectionPointId: string;
  transportModeId: string;
  parcelTypeId: string;
  title: string;
  content: string;
  startDate: string;
  endDate: string;
  active: boolean;
  renewable: boolean;
}

const emptyForm = (): FormState => ({
  collectionPointId: '',
  transportModeId: '',
  parcelTypeId: '',
  title: '',
  content: '',
  startDate: '',
  endDate: '',
  active: true,
  renewable: false,
});

function toFormState(a: AnnouncementResponse): FormState {
  return {
    collectionPointId: String(a.collectionPointId),
    transportModeId: String(a.transportModeId),
    parcelTypeId: String(a.parcelTypeId),
    title: a.title,
    content: a.content,
    startDate: a.startDate,
    endDate: a.endDate,
    active: a.active,
    renewable: a.renewable,
  };
}

interface FormErrors {
  collectionPointId?: string;
  transportModeId?: string;
  parcelTypeId?: string;
  title?: string;
  content?: string;
  startDate?: string;
  endDate?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.collectionPointId) errors.collectionPointId = 'Champ requis';
  if (!form.transportModeId) errors.transportModeId = 'Champ requis';
  if (!form.parcelTypeId) errors.parcelTypeId = 'Champ requis';
  if (!form.title.trim()) errors.title = 'Champ requis';
  if (!form.content.trim()) errors.content = 'Champ requis';
  if (!form.startDate) errors.startDate = 'Champ requis';
  if (!form.endDate) errors.endDate = 'Champ requis';
  if (form.startDate && form.endDate && form.endDate <= form.startDate) {
    errors.endDate = 'Doit être après la date de début';
  }
  return errors;
}

interface AnnouncementFormDialogProps {
  open: boolean;
  announcement: AnnouncementResponse | null;
  collectionPoints: CollectionPointOption[];
  transportModes: TransportModeOption[];
  parcelTypes: ParcelTypeOption[];
  loading: boolean;
  onSave: (data: AnnouncementRequest) => Promise<void>;
  onClose: () => void;
}

function AnnouncementFormDialog({
  open,
  announcement,
  collectionPoints,
  transportModes,
  parcelTypes,
  loading,
  onSave,
  onClose,
}: AnnouncementFormDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(announcement ? toFormState(announcement) : emptyForm());
      setErrors({});
    }
  }, [open, announcement]);

  const set = (field: keyof FormState) => (value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await onSave({
        collectionPointId: Number(form.collectionPointId),
        transportModeId: Number(form.transportModeId),
        parcelTypeId: Number(form.parcelTypeId),
        title: form.title.trim(),
        content: form.content.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        active: form.active,
        renewable: form.renewable,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const isEdit = Boolean(announcement);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm py-8">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? 'Modifier l\'annonce' : 'Nouvelle annonce de départ'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Titre</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title')(e.target.value)}
                  placeholder="Ex : Départ vers Dakar — Lundi"
                  className={cn(
                    'w-full rounded-xl border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary',
                    errors.title ? 'border-red-600 focus:ring-red-600' : 'border-border',
                  )}
                />
                {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
              </div>

              {/* Content */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Contenu</label>
                <textarea
                  rows={3}
                  value={form.content}
                  onChange={(e) => set('content')(e.target.value)}
                  placeholder="Décrivez les détails de l'annonce de départ…"
                  className={cn(
                    'w-full resize-none rounded-xl border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary',
                    errors.content ? 'border-red-600 focus:ring-red-600' : 'border-border',
                  )}
                />
                {errors.content && <p className="text-xs text-red-500">{errors.content}</p>}
              </div>

              {/* Collection point */}
              <SelectField
                label="Point de collecte"
                value={form.collectionPointId}
                onChange={set('collectionPointId')}
                options={collectionPoints.map((c) => ({
                  value: String(c.id),
                  label: `${c.name} (${c.reference})`,
                }))}
                placeholder="Sélectionner un point de collecte"
                error={errors.collectionPointId}
              />

              {/* Transport mode + Parcel type side by side */}
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Mode de transport"
                  value={form.transportModeId}
                  onChange={set('transportModeId')}
                  options={transportModes.map((t) => ({ value: String(t.id), label: t.name }))}
                  placeholder="Sélectionner"
                  error={errors.transportModeId}
                />
                <SelectField
                  label="Type de colis"
                  value={form.parcelTypeId}
                  onChange={set('parcelTypeId')}
                  options={parcelTypes.map((p) => ({ value: String(p.id), label: p.name }))}
                  placeholder="Sélectionner"
                  error={errors.parcelTypeId}
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Date de début</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => set('startDate')(e.target.value)}
                    className={cn(
                      'w-full rounded-xl border bg-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary',
                      errors.startDate ? 'border-red-600 focus:ring-red-600' : 'border-border',
                    )}
                  />
                  {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Date de fin</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => set('endDate')(e.target.value)}
                    className={cn(
                      'w-full rounded-xl border bg-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary',
                      errors.endDate ? 'border-red-600 focus:ring-red-600' : 'border-border',
                    )}
                  />
                  {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => set('active')(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground">Active immédiatement</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={form.renewable}
                    onChange={(e) => set('renewable')(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground">Renouvelable</span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {isEdit ? 'Enregistrer' : 'Créer l\'annonce'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Renew Dialog ─────────────────────────────────────────────────────────────

interface RenewDialogProps {
  open: boolean;
  onRenew: (data: AnnouncementRenewRequest) => Promise<void>;
  onClose: () => void;
}

function RenewDialog({ open, onRenew, onClose }: RenewDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setStartDate(today); setEndDate(''); setError(''); }
  }, [open]);

  const handleSubmit = async () => {
    if (!startDate || !endDate) { setError('Les deux dates sont requises'); return; }
    if (endDate <= startDate) { setError('La date de fin doit être après la date de début'); return; }
    setSubmitting(true);
    try {
      await onRenew({ startDate, endDate });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold text-foreground">Renouveler l'annonce</h3>
        <p className="mt-1 text-sm text-muted-foreground">Définissez les nouvelles dates de validité.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            Renouveler
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        active
          ? 'bg-green-950 text-green-400 ring-1 ring-green-800'
          : 'bg-muted text-muted-foreground ring-1 ring-border',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-green-400' : 'bg-muted-foreground')} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface AnnouncementCardProps {
  announcement: AnnouncementResponse;
  isAdmin: boolean;
  onEdit: () => void;
  onRenew: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function AnnouncementCard({ announcement: a, isAdmin, onEdit, onRenew, onToggle, onDelete }: AnnouncementCardProps) {
  const isExpired = new Date(a.endDate) < new Date();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge active={a.active} />
            {a.renewable && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-950 px-2.5 py-0.5 text-xs font-medium text-blue-400 ring-1 ring-blue-800">
                <RotateCcw className="h-3 w-3" />
                Renouvelable
              </span>
            )}
            {isExpired && (
              <span className="inline-flex items-center rounded-full bg-amber-950 px-2.5 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-800">
                Expirée
              </span>
            )}
          </div>
          <h3 className="mt-2 text-sm font-semibold text-foreground line-clamp-1">{a.title}</h3>
        </div>

        {/* Actions */}
        {isAdmin && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={onEdit}
              title="Modifier"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {a.renewable && (
              <button
                onClick={onRenew}
                title="Renouveler"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-blue-400"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onToggle}
              title={a.active ? 'Désactiver' : 'Activer'}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                a.active
                  ? 'text-muted-foreground hover:bg-muted hover:text-amber-400'
                  : 'text-muted-foreground hover:bg-muted hover:text-green-400',
              )}
            >
              {a.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            </button>
            <button
              onClick={onDelete}
              title="Supprimer"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{a.content}</p>

      {/* Meta row */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          {a.collectionPointName}
        </span>
        <span className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          {a.transportModeName}
        </span>
        <span className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          {a.parcelTypeName}
        </span>
      </div>

      {/* Date range */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        <span>
          {formatDate(a.startDate)} — {formatDate(a.endDate)}
        </span>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function CompanyAnnouncements() {
  const { token, role, companyId: storedCompanyId, setCompanyId } = useAuthStore();
  const { toasts, show } = useToast();

  const [companyId, setLocalCompanyId] = useState<number>(storedCompanyId ?? 0);
  const [resolvingCompany, setResolvingCompany] = useState(storedCompanyId === undefined || storedCompanyId === 0);

  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [collectionPoints, setCollectionPoints] = useState<CollectionPointOption[]>([]);
  const [transportModes, setTransportModes] = useState<TransportModeOption[]>([]);
  const [parcelTypes, setParcelTypes] = useState<ParcelTypeOption[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AnnouncementResponse | null>(null);
  const [renewTarget, setRenewTarget] = useState<AnnouncementResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementResponse | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AnnouncementResponse | null>(null);

  const isAdmin = role === 'ADMIN_COMPANY' || role === 'EMPLOYEE_COMPANY';

  // ── Resolve companyId if not yet in store ──
  useEffect(() => {
    if (companyId > 0) { setResolvingCompany(false); return; }
    if (!token) return;

    setResolvingCompany(true);
    getCompanies(token, { page: 0, size: 1 })
      .then((page) => {
        if (page.content.length > 0) {
          const id = page.content[0].id;
          setLocalCompanyId(id);
          setCompanyId(id);
        } else {
          setError('Aucune entreprise associée à votre compte.');
        }
      })
      .catch(() => setError('Impossible de récupérer l\'entreprise.'))
      .finally(() => setResolvingCompany(false));
  }, []);

  // ── Fetch announcements ──
  const fetchAnnouncements = useCallback(async (cId: number) => {
    if (!token || cId === 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAnnouncements(token, cId);
      setAnnouncements(data);
    } catch {
      setError('Impossible de charger les annonces.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (companyId > 0) fetchAnnouncements(companyId);
  }, [companyId, fetchAnnouncements]);

  // Sync local companyId when store resolves
  useEffect(() => {
    if (storedCompanyId && storedCompanyId > 0 && companyId === 0) {
      setLocalCompanyId(storedCompanyId);
    }
  }, [storedCompanyId]);

  // ── Fetch support data when form opens ──
  const supportFetched = useRef(false);

  const openForm = useCallback(
    async (announcement: AnnouncementResponse | null) => {
      setEditTarget(announcement);
      setFormOpen(true);

      if (!supportFetched.current && companyId > 0 && token) {
        setSupportLoading(true);
        try {
          const [cp, tm, pt] = await Promise.all([
            getCompanyCollectionPoints(token, companyId),
            getCompanyTransportModes(token, companyId),
            getCompanyParcelTypes(token, companyId),
          ]);
          setCollectionPoints(cp);
          setTransportModes(tm);
          setParcelTypes(pt);
          supportFetched.current = true;
        } catch {
          show('Erreur lors du chargement des données du formulaire', 'error');
        } finally {
          setSupportLoading(false);
        }
      }
    },
    [companyId, token, show],
  );

  // ── CRUD handlers ──
  const handleSave = async (data: AnnouncementRequest) => {
    if (!token || companyId === 0) return;
    if (editTarget) {
      const updated = await updateAnnouncement(token, companyId, editTarget.id, data);
      setAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      show('Annonce mise à jour');
    } else {
      const created = await createAnnouncement(token, companyId, data);
      setAnnouncements((prev) => [created, ...prev]);
      show('Annonce créée');
    }
  };

  const handleRenew = async (data: AnnouncementRenewRequest) => {
    if (!token || !renewTarget || companyId === 0) return;
    const updated = await renewAnnouncement(token, companyId, renewTarget.id, data);
    setAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    show('Annonce renouvelée');
    setRenewTarget(null);
  };

  const handleToggle = async () => {
    if (!token || !toggleTarget || companyId === 0) return;
    try {
      const fn = toggleTarget.active ? deactivateAnnouncement : activateAnnouncement;
      const updated = await fn(token, companyId, toggleTarget.id);
      setAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      show(toggleTarget.active ? 'Annonce désactivée' : 'Annonce activée');
    } catch {
      show('Erreur lors du changement de statut', 'error');
    } finally {
      setToggleTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget || companyId === 0) return;
    try {
      await deleteAnnouncement(token, companyId, deleteTarget.id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      show('Annonce supprimée');
    } catch {
      show('Erreur lors de la suppression', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Render ──
  if (resolvingCompany) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error && companyId === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-xl font-bold text-foreground">
            <Megaphone className="h-6 w-6 text-primary" />
            Annonces de départ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez les annonces de départ pour informer vos équipes et clients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAnnouncements(companyId)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Actualiser
          </button>
          {isAdmin && (
            <button
              onClick={() => openForm(null)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Nouvelle annonce
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && companyId > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border">
          <Megaphone className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucune annonce de départ pour le moment.</p>
          {isAdmin && (
            <button
              onClick={() => openForm(null)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Créer la première annonce
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {announcements.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              isAdmin={isAdmin}
              onEdit={() => openForm(a)}
              onRenew={() => setRenewTarget(a)}
              onToggle={() => setToggleTarget(a)}
              onDelete={() => setDeleteTarget(a)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AnnouncementFormDialog
        open={formOpen}
        announcement={editTarget}
        collectionPoints={collectionPoints}
        transportModes={transportModes}
        parcelTypes={parcelTypes}
        loading={supportLoading}
        onSave={handleSave}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
      />

      <RenewDialog
        open={Boolean(renewTarget)}
        onRenew={handleRenew}
        onClose={() => setRenewTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.active ? 'Désactiver l\'annonce' : 'Activer l\'annonce'}
        description={
          toggleTarget?.active
            ? 'Cette annonce ne sera plus visible. Vous pourrez la réactiver à tout moment.'
            : 'Cette annonce redeviendra visible pour vos équipes et clients.'
        }
        confirmLabel={toggleTarget?.active ? 'Désactiver' : 'Activer'}
        onConfirm={handleToggle}
        onClose={() => setToggleTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Supprimer l'annonce"
        description={`Supprimer définitivement « ${deleteTarget?.title} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ToastBar toasts={toasts} />
    </div>
  );
}
