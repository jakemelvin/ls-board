'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldOff,
  Trash2,
  Phone,
  Lock,
  Percent,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  ExternalLink,
  UserPlus,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  getUsers,
  getCompanies,
  activateUser,
  suspendUser,
  deleteUser,
  updateUserPhone,
  changeUserPassword,
  updateUserCommission,
  approveCompany,
  deleteCompany,
  getCompanyOperationalReadiness,
} from '@/lib/admin/api';
import type {
  Page,
  CompanyOperationalReadiness,
  UserResponse,
  CompanyResponse,
} from '@/lib/admin/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  CLIENT: 'Client',
  COLLECTOR: 'Collecteur',
  TRANSPORTER: 'Transporteur',
  ADMIN_COMPANY: 'Admin Entreprise',
  EMPLOYEE_COMPANY: 'Employé Entreprise',
  SUPER_ADMIN: 'Super Admin',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Actif', color: 'bg-success/20 text-success' },
  INACTIVE: { label: 'Inactif', color: 'bg-muted text-muted-foreground' },
  SUSPENDED: { label: 'Suspendu', color: 'bg-destructive/20 text-destructive' },
  DELETED: { label: 'Supprimé', color: 'bg-muted text-muted-foreground' },
};

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}

// ─── Confirm dialog ────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {confirmLabel}
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Field dialog (single input) ───────────────────────────────────────────

interface FieldDialogProps {
  open: boolean;
  title: string;
  label: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  loading?: boolean;
  error?: string | null;
  onSave: (value: string) => void;
  onClose: () => void;
  children?: React.ReactNode;
}

function FieldDialog({
  open,
  title,
  label,
  defaultValue = '',
  type = 'text',
  placeholder,
  loading = false,
  error,
  onSave,
  onClose,
  children,
}: FieldDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {children ?? (
          <div className="space-y-1.5">
            <Label htmlFor="field-input">{label}</Label>
            <Input
              id="field-input"
              type={type}
              value={value}
              placeholder={placeholder}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && onSave(value)}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={() => onSave(value)} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Enregistrement…
              </span>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Password dialog ───────────────────────────────────────────────────────

function PasswordDialog({
  open,
  loading,
  error,
  onSave,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  onSave: (old: string, next: string) => void;
  onClose: () => void;
}) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  useEffect(() => {
    if (open) { setOldPw(''); setNewPw(''); setConfirmPw(''); }
  }, [open]);

  const mismatch = newPw && confirmPw && newPw !== confirmPw;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
        <h3 className="font-semibold text-foreground">Changer le mot de passe</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Ancien mot de passe</Label>
            <Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Nouveau mot de passe</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmer</Label>
            <Input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className={cn(mismatch && 'border-destructive')}
            />
            {mismatch && <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button
            onClick={() => onSave(oldPw, newPw)}
            disabled={loading || !oldPw || !newPw || newPw !== confirmPw}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Enregistrement…
              </span>
            ) : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Operational readiness dialog ─────────────────────────────────────────

function ReadinessDialog({
  data,
  onClose,
}: {
  data: CompanyOperationalReadiness | null;
  onClose: () => void;
}) {
  if (!data) return null;

  const checks = [
    { label: 'Types de colis', ok: data.parcelTypesConfigured, count: data.parcelTypeCount },
    { label: 'Modes de transport', ok: data.transportModesConfigured, count: data.transportModeCount },
    { label: 'Tarification', ok: data.pricingConfigured, count: data.pricingCount },
    { label: 'Zones géographiques', ok: data.zonesConfigured, count: data.zoneCount },
    { label: 'Points de collecte', ok: data.collectionPointsConfigured, count: data.collectionPointCount },
    { label: 'Responsables points', ok: data.collectionPointResponsiblesConfigured },
    { label: 'Transporteurs', ok: data.transportersConfigured, count: data.transporterCount },
    { label: 'Flottes assignées', ok: data.assignedFlottesConfigured, count: data.assignedFlotteCount },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{data.companyName}</h3>
            <p className="text-sm text-muted-foreground">Vérification opérationnelle</p>
          </div>
          <Badge
            className={data.exploitable ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}
          >
            {data.exploitable ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {data.exploitable ? 'Opérationnelle' : 'Non opérationnelle'}
          </Badge>
        </div>

        <div className="space-y-2">
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                {check.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm text-foreground">{check.label}</span>
              </div>
              {check.count !== undefined && (
                <span className="text-sm font-medium text-muted-foreground">{check.count}</span>
              )}
            </div>
          ))}
        </div>

        {data.missingItems.length > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 space-y-2">
            <p className="text-sm font-semibold text-warning">Éléments manquants</p>
            <ul className="space-y-1">
              {data.missingItems.map((item) => (
                <li key={item} className="text-xs text-warning/80 flex items-start gap-1.5">
                  <span className="mt-0.5 text-warning">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.summary && (
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl px-4 py-3">{data.summary}</p>
        )}

        <Button variant="outline" className="w-full" onClick={onClose}>Fermer</Button>
      </div>
    </div>
  );
}

// ─── Toast helper ──────────────────────────────────────────────────────────

function useToastSimple() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  return {
    toast,
    success: (msg: string) => setToast({ msg, type: 'success' }),
    error: (msg: string) => setToast({ msg, type: 'error' }),
  };
}

function ToastBar({ toast }: { toast: { msg: string; type: 'success' | 'error' } | null }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-60 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2',
        toast.type === 'success'
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {toast.msg}
    </div>
  );
}

// ─── Pagination bar ────────────────────────────────────────────────────────

function PaginationBar({
  page,
  totalPages,
  totalElements,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm text-muted-foreground">
      <span>{totalElements} résultat{totalElements !== 1 ? 's' : ''}</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 text-foreground font-medium">
          {page + 1} / {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Companies tab ─────────────────────────────────────────────────────────

function CompaniesTab({ token }: { token: string }) {
  const { success, error: showError, toast } = useToastSimple();
  const [data, setData] = useState<Page<CompanyResponse> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [readiness, setReadiness] = useState<CompanyOperationalReadiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CompanyResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCompanies(token, { page, size: 15 });
      setData(result);
    } catch {
      showError('Impossible de charger les entreprises');
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (company: CompanyResponse) => {
    setActionLoading(company.id);
    try {
      const updated = await approveCompany(token, company.id);
      setData((prev) =>
        prev
          ? {
              ...prev,
              content: prev.content.map((c) => (c.id === updated.id ? updated : c)),
            }
          : prev,
      );
      success(`${company.name} approuvée`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erreur lors de l\'approbation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReadiness = async (company: CompanyResponse) => {
    setReadinessLoading(company.id);
    try {
      const result = await getCompanyOperationalReadiness(token, company.id);
      setReadiness(result);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erreur lors de la vérification');
    } finally {
      setReadinessLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(confirmDelete.id);
    try {
      await deleteCompany(token, confirmDelete.id);
      setData((prev) =>
        prev
          ? { ...prev, content: prev.content.filter((c) => c.id !== confirmDelete.id), totalElements: prev.totalElements - 1 }
          : prev,
      );
      success(`${confirmDelete.name} supprimée`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <>
      <ToastBar toast={toast} />
      <ReadinessDialog data={readiness} onClose={() => setReadiness(null)} />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer l'entreprise"
        description={`Êtes-vous sûr de vouloir supprimer "${confirmDelete?.name}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        destructive
        loading={actionLoading === confirmDelete?.id}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Entreprise</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Pays · Ville</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.content.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  Aucune entreprise trouvée
                </td>
              </tr>
            )}
            {data?.content.map((company) => (
              <tr key={company.id} className="group hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{company.name}</p>
                    {company.companyUrl && (
                      <a
                        href={company.companyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {company.companyUrl.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-foreground">{company.phone}</p>
                  {company.email && <p className="text-xs text-muted-foreground">{company.email}</p>}
                </td>
                <td className="px-4 py-3">
                  <p className="text-foreground">{company.country?.countryName ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{company.city}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-foreground">{company.adminUsername ?? '—'}</p>
                  {company.adminId && (
                    <p className="text-xs text-muted-foreground">ID #{company.adminId}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Badge
                      className={
                        company.approved
                          ? 'bg-success/20 text-success'
                          : 'bg-warning/20 text-warning'
                      }
                    >
                      {company.approved ? (
                        <><CheckCircle2 className="h-3 w-3" />Approuvée</>
                      ) : (
                        <><Info className="h-3 w-3" />En attente</>
                      )}
                    </Badge>
                    {company.exploitable && (
                      <Badge className="bg-primary/20 text-primary">
                        <Shield className="h-3 w-3" />Opérationnelle
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Check readiness */}
                    <button
                      onClick={() => handleReadiness(company)}
                      disabled={readinessLoading === company.id}
                      title="Vérifier opérationnalité"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                    >
                      {readinessLoading === company.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Approve */}
                    {!company.approved && (
                      <button
                        onClick={() => handleApprove(company)}
                        disabled={actionLoading === company.id}
                        title="Approuver"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-success transition-colors hover:bg-success/10 disabled:opacity-40"
                      >
                        {actionLoading === company.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => setConfirmDelete(company)}
                      title="Supprimer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPageChange={setPage}
        />
      )}
    </>
  );
}

// ─── Users tab ─────────────────────────────────────────────────────────────

type UserAction = 'phone' | 'password' | 'commission' | 'delete' | null;

function UsersTab({ token }: { token: string }) {
  const { success, error: showError, toast } = useToastSimple();
  const [data, setData] = useState<Page<UserResponse> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [action, setAction] = useState<UserAction>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUsers(token, { page, size: 20 });
      setData(result);
    } catch {
      showError('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { load(); }, [load]);

  const openAction = (user: UserResponse, act: UserAction) => {
    setSelectedUser(user);
    setAction(act);
    setFieldError(null);
  };

  const closeAction = () => {
    setSelectedUser(null);
    setAction(null);
    setFieldError(null);
  };

  const patchUser = (updated: UserResponse) => {
    setData((prev) =>
      prev
        ? { ...prev, content: prev.content.map((u) => (u.id === updated.id ? updated : u)) }
        : prev,
    );
  };

  const removeUser = (id: number) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            content: prev.content.filter((u) => u.id !== id),
            totalElements: prev.totalElements - 1,
          }
        : prev,
    );
  };

  const handleActivate = async (user: UserResponse) => {
    setActionLoading(user.id);
    try {
      await activateUser(token, user.id);
      patchUser({ ...user, status: 'ACTIVE' });
      success(`${user.username} activé`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (user: UserResponse) => {
    setActionLoading(user.id);
    try {
      await suspendUser(token, user.id);
      patchUser({ ...user, status: 'SUSPENDED' });
      success(`${user.username} suspendu`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePhoneSave = async (phone: string) => {
    if (!selectedUser) return;
    setFieldError(null);
    setActionLoading(selectedUser.id);
    try {
      await updateUserPhone(token, selectedUser.id, phone);
      patchUser({ ...selectedUser, phone });
      success('Téléphone mis à jour');
      closeAction();
    } catch (err) {
      setFieldError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePasswordSave = async (oldPw: string, newPw: string) => {
    if (!selectedUser) return;
    setFieldError(null);
    setActionLoading(selectedUser.id);
    try {
      await changeUserPassword(token, selectedUser.id, { oldPassword: oldPw, newPassword: newPw });
      success('Mot de passe modifié');
      closeAction();
    } catch (err) {
      setFieldError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCommissionSave = async (value: string) => {
    if (!selectedUser) return;
    const pct = parseFloat(value);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setFieldError('Valeur entre 0 et 100');
      return;
    }
    setFieldError(null);
    setActionLoading(selectedUser.id);
    try {
      const updated = await updateUserCommission(token, selectedUser.id, { commissionPercentage: pct });
      patchUser(updated);
      success('Commission mise à jour');
      closeAction();
    } catch (err) {
      setFieldError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setActionLoading(selectedUser.id);
    try {
      await deleteUser(token, selectedUser.id);
      removeUser(selectedUser.id);
      success(`${selectedUser.username} supprimé`);
      closeAction();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erreur lors de la suppression');
      closeAction();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  const isLoading = (id: number) => actionLoading === id;

  return (
    <>
      <ToastBar toast={toast} />

      {/* Phone dialog */}
      <FieldDialog
        open={action === 'phone'}
        title={`Téléphone — ${selectedUser?.username}`}
        label="Nouveau téléphone"
        defaultValue={selectedUser?.phone}
        placeholder="+237 6 12 34 56 78"
        loading={actionLoading === selectedUser?.id}
        error={fieldError}
        onSave={handlePhoneSave}
        onClose={closeAction}
      />

      {/* Password dialog */}
      <PasswordDialog
        open={action === 'password'}
        loading={actionLoading === selectedUser?.id}
        error={fieldError}
        onSave={handlePasswordSave}
        onClose={closeAction}
      />

      {/* Commission dialog */}
      <FieldDialog
        open={action === 'commission'}
        title={`Commission — ${selectedUser?.username}`}
        label="Pourcentage de commission (0–100)"
        defaultValue={String(selectedUser?.commissionPercentage ?? '')}
        type="number"
        placeholder="12.5"
        loading={actionLoading === selectedUser?.id}
        error={fieldError}
        onSave={handleCommissionSave}
        onClose={closeAction}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={action === 'delete'}
        title="Supprimer l'utilisateur"
        description={`Êtes-vous sûr de vouloir supprimer "${selectedUser?.username}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        destructive
        loading={actionLoading === selectedUser?.id}
        onConfirm={handleDelete}
        onCancel={closeAction}
      />

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.content.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            )}
            {data?.content.map((user) => {
              const statusCfg = STATUS_CONFIG[user.status] ?? STATUS_CONFIG.INACTIVE;
              return (
                <tr key={user.id} className="group hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                      {user.email && (
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="bg-secondary text-secondary-foreground">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{user.phone}</p>
                    {user.city && <p className="text-xs text-muted-foreground">{user.city}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {user.commissionPercentage != null ? (
                      <span className="font-medium text-foreground">
                        {user.commissionPercentage}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Activate */}
                      {user.status !== 'ACTIVE' && (
                        <button
                          onClick={() => handleActivate(user)}
                          disabled={isLoading(user.id)}
                          title="Activer"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-success transition-colors hover:bg-success/10 disabled:opacity-40"
                        >
                          {isLoading(user.id) ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Shield className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {/* Suspend */}
                      {user.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleSuspend(user)}
                          disabled={isLoading(user.id)}
                          title="Suspendre"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-warning transition-colors hover:bg-warning/10 disabled:opacity-40"
                        >
                          {isLoading(user.id) ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldOff className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {/* Phone */}
                      <button
                        onClick={() => openAction(user, 'phone')}
                        title="Modifier téléphone"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </button>

                      {/* Password */}
                      <button
                        onClick={() => openAction(user, 'password')}
                        title="Changer mot de passe"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </button>

                      {/* Commission */}
                      <button
                        onClick={() => openAction(user, 'commission')}
                        title="Modifier commission"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Percent className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => openAction(user, 'delete')}
                        title="Supprimer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPageChange={setPage}
        />
      )}
    </>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────

type TabId = 'companies' | 'users';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'companies', label: 'Entreprises', icon: Building2 },
  { id: 'users', label: 'Utilisateurs', icon: Users },
];

export function SuperAdminManagement() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const [activeTab, setActiveTab] = useState<TabId>('companies');
  const [refreshKey, setRefreshKey] = useState(0);

  if (role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Shield className="h-8 w-8" />
        </div>
        <p className="text-lg font-semibold text-foreground">Accès restreint</p>
        <p className="text-sm text-muted-foreground">
          Cette section est réservée aux super administrateurs.
        </p>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion des entreprises et utilisateurs de la plateforme
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="shrink-0"
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Actualiser
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div key={`${activeTab}-${refreshKey}`}>
        {activeTab === 'companies' && <CompaniesTab token={token} />}
        {activeTab === 'users' && <UsersTab token={token} />}
      </div>
    </div>
  );
}
