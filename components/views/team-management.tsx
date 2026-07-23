'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  MapPin,
  Percent,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataPagination } from '@/components/ui/data-pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  getCompanyEmployees,
  suspendUser,
  activateUser,
  deleteUser,
  updateUserPhone,
  changeUserPassword,
  updateUserCommission,
} from '@/lib/admin/api';
import type { UserResponse, ApiRole, UserStatus } from '@/lib/admin/types';
import {
  Badge,
  CompanyGuard,
  ConfirmDialog,
  SectionHeader,
  StatusState,
  ToastBar,
  useToastSimple,
} from '@/components/company/company-shared';
import { CreateMemberDialog } from '@/components/company/create-member-dialog';
import { useClientPagination } from '@/hooks/use-client-pagination';

// ─── Display config ────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  CLIENT: 'Client',
  COLLECTOR: 'Collecteur',
  TRANSPORTER: 'Transporteur',
  ADMIN_COMPANY: 'Admin',
  EMPLOYEE_COMPANY: 'Employé',
  SUPER_ADMIN: 'Super Admin',
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN_COMPANY: 'bg-primary/20 text-primary',
  EMPLOYEE_COMPANY: 'bg-chart-1/20 text-chart-1',
  COLLECTOR: 'bg-chart-2/20 text-chart-2',
  TRANSPORTER: 'bg-warning/20 text-warning',
  CLIENT: 'bg-muted text-muted-foreground',
  SUPER_ADMIN: 'bg-violet-600/20 text-violet-400',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Actif', color: 'bg-success/20 text-success' },
  INACTIVE: { label: 'Inactif', color: 'bg-muted text-muted-foreground' },
  SUSPENDED: { label: 'Suspendu', color: 'bg-destructive/20 text-destructive' },
  DELETED: { label: 'Supprimé', color: 'bg-muted text-muted-foreground' },
};

const ROLE_FILTERS: ApiRole[] = ['EMPLOYEE_COMPANY', 'COLLECTOR', 'TRANSPORTER', 'ADMIN_COMPANY'];

function initials(user: Pick<UserResponse, 'firstName' | 'lastName' | 'username'>) {
  const base = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username;
  return base
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function fullName(user: UserResponse) {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username;
}

// ─── Small dialogs ───────────────────────────────────────────────────────────

function PhoneDialog({
  open, current, loading, onSave, onClose,
}: {
  open: boolean; current: string; loading: boolean;
  onSave: (phone: string) => void; onClose: () => void;
}) {
  const [phone, setPhone] = useState(current);
  useEffect(() => { if (open) setPhone(current); }, [open, current]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="font-semibold text-foreground">Modifier le téléphone</h3>
        <div className="space-y-1.5">
          <Label>Numéro de téléphone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 77 000 00 00" autoFocus />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={() => onSave(phone.trim())} disabled={loading || !phone.trim()}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PasswordDialog({
  open, loading, error, onSave, onClose,
}: {
  open: boolean; loading: boolean; error: string | null;
  onSave: (oldPw: string, newPw: string) => void; onClose: () => void;
}) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  useEffect(() => { if (open) { setOldPw(''); setNewPw(''); setConfirmPw(''); } }, [open]);
  const mismatch = newPw && confirmPw && newPw !== confirmPw;
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
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
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={() => onSave(oldPw, newPw)} disabled={loading || !oldPw || newPw.length < 8 || newPw !== confirmPw}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommissionDialog({
  open, current, loading, onSave, onClose,
}: {
  open: boolean; current: number | undefined; loading: boolean;
  onSave: (value: number) => void; onClose: () => void;
}) {
  const [value, setValue] = useState('');
  useEffect(() => { if (open) setValue(current?.toString() ?? ''); }, [open, current]);
  const num = parseFloat(value);
  const invalid = value.trim() === '' || isNaN(num) || num < 0 || num > 100;
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="font-semibold text-foreground">Modifier la commission</h3>
        <div className="space-y-1.5">
          <Label>Commission (%)</Label>
          <Input
            type="number" min="0" max="100" step="0.01"
            value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ex : 12" autoFocus
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={() => onSave(num)} disabled={loading || invalid}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, value, label, tone }: {
  icon: React.ElementType; value: number; label: string; tone: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-3 p-3 sm:p-4">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10', tone)}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-foreground sm:text-2xl">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Action buttons ───────────────────────────────────────────────────────

function MemberActions({
  user, busy, onPhone, onPassword, onCommission, onToggleStatus, onDelete,
}: {
  user: UserResponse;
  busy: boolean;
  onPhone: () => void;
  onPassword: () => void;
  onCommission: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const isActive = user.status === 'ACTIVE';
  const showCommission = user.role === 'COLLECTOR' || user.role === 'TRANSPORTER';
  const btn = 'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40';
  return (
    <div className="flex items-center gap-1">
      <button className={btn} onClick={onPhone} disabled={busy} title="Téléphone"><Phone className="h-3.5 w-3.5" /></button>
      <button className={btn} onClick={onPassword} disabled={busy} title="Mot de passe"><KeyRound className="h-3.5 w-3.5" /></button>
      {showCommission && (
        <button className={btn} onClick={onCommission} disabled={busy} title="Commission"><Percent className="h-3.5 w-3.5" /></button>
      )}
      <button
        className={cn(btn, isActive ? 'hover:bg-warning/10 hover:text-warning' : 'hover:bg-success/10 hover:text-success')}
        onClick={onToggleStatus}
        disabled={busy}
        title={isActive ? 'Suspendre' : 'Activer'}
      >
        {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : isActive ? <UserMinus className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
      </button>
      <button className={cn(btn, 'hover:bg-destructive/10 hover:text-destructive')} onClick={onDelete} disabled={busy} title="Supprimer">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Inner view (company resolved) ────────────────────────────────────────

function TeamManagementInner({ companyId, companyName }: { companyId: number; companyName: string }) {
  const token = useAuthStore((s) => s.token);
  const { toast, success, error: showError } = useToastSimple();

  const [members, setMembers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<ApiRole | 'ALL'>('ALL');
  const [busyId, setBusyId] = useState<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [phoneTarget, setPhoneTarget] = useState<UserResponse | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<UserResponse | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [commissionTarget, setCommissionTarget] = useState<UserResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getCompanyEmployees(token, companyId);
      setMembers(data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [token, companyId]);

  useEffect(() => { load(); }, [load]);

  const upsert = (user: UserResponse) =>
    setMembers((prev) => {
      const exists = prev.some((m) => m.id === user.id);
      return exists ? prev.map((m) => (m.id === user.id ? user : m)) : [user, ...prev];
    });

  const patchStatus = (id: number, status: UserStatus) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));

  const handleToggleStatus = async (user: UserResponse) => {
    setBusyId(user.id);
    const next: UserStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      if (next === 'SUSPENDED') await suspendUser(token, user.id);
      else await activateUser(token, user.id);
      patchStatus(user.id, next);
      success(next === 'SUSPENDED' ? `${fullName(user)} suspendu` : `${fullName(user)} activé`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Action impossible');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDialogLoading(true);
    try {
      await deleteUser(token, deleteTarget.id);
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      success(`${fullName(deleteTarget)} supprimé`);
      setDeleteTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Suppression impossible');
    } finally {
      setDialogLoading(false);
    }
  };

  const handlePhone = async (phone: string) => {
    if (!phoneTarget) return;
    setDialogLoading(true);
    try {
      await updateUserPhone(token, phoneTarget.id, phone);
      setMembers((prev) => prev.map((m) => (m.id === phoneTarget.id ? { ...m, phone } : m)));
      success('Téléphone mis à jour');
      setPhoneTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Mise à jour impossible');
    } finally {
      setDialogLoading(false);
    }
  };

  const handlePassword = async (oldPassword: string, newPassword: string) => {
    if (!passwordTarget) return;
    setDialogLoading(true);
    setPasswordError(null);
    try {
      await changeUserPassword(token, passwordTarget.id, { oldPassword, newPassword });
      success('Mot de passe mis à jour');
      setPasswordTarget(null);
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Mise à jour impossible');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleCommission = async (value: number) => {
    if (!commissionTarget) return;
    setDialogLoading(true);
    try {
      const updated = await updateUserCommission(token, commissionTarget.id, { commissionPercentage: value });
      upsert(updated);
      success('Commission mise à jour');
      setCommissionTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Mise à jour impossible');
    } finally {
      setDialogLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
      if (!matchesRole) return false;
      if (!q) return true;
      return (
        fullName(m).toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q) ||
        (m.phone ?? '').toLowerCase().includes(q)
      );
    });
  }, [members, search, roleFilter]);
  const memberPagination = useClientPagination(
    filtered,
    20,
    `${search}:${roleFilter}`,
  );

  const counts = useMemo(() => ({
    total: members.length,
    active: members.filter((m) => m.status === 'ACTIVE').length,
    suspended: members.filter((m) => m.status === 'SUSPENDED').length,
    collectors: members.filter((m) => m.role === 'COLLECTOR').length,
    transporters: members.filter((m) => m.role === 'TRANSPORTER').length,
  }), [members]);

  return (
    <div className="space-y-5">
      <ToastBar toast={toast} />
      {token && (
        <CreateMemberDialog
          open={createOpen}
          token={token}
          companyId={companyId}
          onCreated={(u) => { upsert(u); success(`${fullName(u)} ajouté`); }}
          onClose={() => setCreateOpen(false)}
        />
      )}
      <PhoneDialog
        open={!!phoneTarget}
        current={phoneTarget?.phone ?? ''}
        loading={dialogLoading}
        onSave={handlePhone}
        onClose={() => setPhoneTarget(null)}
      />
      <PasswordDialog
        open={!!passwordTarget}
        loading={dialogLoading}
        error={passwordError}
        onSave={handlePassword}
        onClose={() => { setPasswordTarget(null); setPasswordError(null); }}
      />
      <CommissionDialog
        open={!!commissionTarget}
        current={commissionTarget?.commissionPercentage}
        loading={dialogLoading}
        onSave={handleCommission}
        onClose={() => setCommissionTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer le membre"
        description={`Êtes-vous sûr de vouloir supprimer ${deleteTarget ? fullName(deleteTarget) : ''} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        destructive
        loading={dialogLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <SectionHeader
        title="Gestion d'équipe"
        subtitle={`Membres de ${companyName} : employés, collecteurs et transporteurs.`}
        action={
          <Button className="gap-2 self-start sm:self-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Ajouter un membre
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Users} value={counts.total} label="Membres" tone="bg-primary/20 text-primary" />
        <StatCard icon={UserCheck} value={counts.active} label="Actifs" tone="bg-success/20 text-success" />
        <StatCard icon={UserMinus} value={counts.suspended} label="Suspendus" tone="bg-destructive/20 text-destructive" />
        <StatCard icon={MapPin} value={counts.collectors} label="Collecteurs" tone="bg-chart-2/20 text-chart-2" />
        <StatCard icon={Truck} value={counts.transporters} label="Transporteurs" tone="bg-warning/20 text-warning" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, identifiant, email ou téléphone…"
            className="bg-secondary pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={roleFilter === 'ALL' ? 'default' : 'outline'} size="sm" onClick={() => setRoleFilter('ALL')}>
            Tous ({members.length})
          </Button>
          {ROLE_FILTERS.map((role) => {
            const count = members.filter((m) => m.role === role).length;
            if (count === 0 && role === 'ADMIN_COMPANY') return null;
            return (
              <Button key={role} variant={roleFilter === role ? 'default' : 'outline'} size="sm" onClick={() => setRoleFilter(role)}>
                {ROLE_LABELS[role]} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : loadError ? (
        <StatusState
          icon={Users}
          tone="destructive"
          title="Erreur de chargement"
          description={loadError}
          action={<Button variant="outline" className="gap-2" onClick={load}><RefreshCw className="h-4 w-4" />Réessayer</Button>}
        />
      ) : filtered.length === 0 ? (
        <StatusState
          icon={Users}
          title={members.length === 0 ? 'Aucun membre' : 'Aucun résultat'}
          description={
            members.length === 0
              ? "Ajoutez votre premier membre d'équipe pour commencer."
              : 'Aucun membre ne correspond à votre recherche.'
          }
          action={members.length === 0 ? (
            <Button className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Ajouter un membre</Button>
          ) : undefined}
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="grid gap-3 md:hidden">
            {memberPagination.paginatedItems.map((m) => (
              <Card key={m.id} className="border-border bg-card">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{initials(m)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{fullName(m)}</p>
                      <p className="truncate text-xs text-muted-foreground">@{m.username}</p>
                    </div>
                    <Badge className={STATUS_CONFIG[m.status]?.color ?? 'bg-muted text-muted-foreground'}>
                      {STATUS_CONFIG[m.status]?.label ?? m.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge className={ROLE_BADGE[m.role] ?? 'bg-muted text-muted-foreground'}>{ROLE_LABELS[m.role] ?? m.role}</Badge>
                    {m.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>}
                    {m.commissionPercentage != null && (m.role === 'COLLECTOR' || m.role === 'TRANSPORTER') && (
                      <span className="inline-flex items-center gap-1"><Percent className="h-3 w-3" />{m.commissionPercentage}%</span>
                    )}
                  </div>
                  <div className="flex justify-end border-t border-border pt-2">
                    <MemberActions
                      user={m}
                      busy={busyId === m.id}
                      onPhone={() => setPhoneTarget(m)}
                      onPassword={() => setPasswordTarget(m)}
                      onCommission={() => setCommissionTarget(m)}
                      onToggleStatus={() => handleToggleStatus(m)}
                      onDelete={() => setDeleteTarget(m)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Membre</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {memberPagination.paginatedItems.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{initials(m)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{fullName(m)}</p>
                          <p className="truncate text-xs text-muted-foreground">@{m.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{m.phone || '—'}</p>
                      {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={ROLE_BADGE[m.role] ?? 'bg-muted text-muted-foreground'}>{ROLE_LABELS[m.role] ?? m.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_CONFIG[m.status]?.color ?? 'bg-muted text-muted-foreground'}>
                        {STATUS_CONFIG[m.status]?.label ?? m.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {(m.role === 'COLLECTOR' || m.role === 'TRANSPORTER') && m.commissionPercentage != null
                        ? `${m.commissionPercentage}%`
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <MemberActions
                          user={m}
                          busy={busyId === m.id}
                          onPhone={() => setPhoneTarget(m)}
                          onPassword={() => setPasswordTarget(m)}
                          onCommission={() => setCommissionTarget(m)}
                          onToggleStatus={() => handleToggleStatus(m)}
                          onDelete={() => setDeleteTarget(m)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DataPagination
            page={memberPagination.page}
            pageSize={memberPagination.pageSize}
            totalPages={memberPagination.totalPages}
            totalElements={memberPagination.totalElements}
            onPageChange={memberPagination.setPage}
            onPageSizeChange={memberPagination.setPageSize}
          />
        </>
      )}
    </div>
  );
}

export function TeamManagement() {
  return (
    <CompanyGuard>
      {({ companyId, company }) => (
        <TeamManagementInner companyId={companyId} companyName={company.name} />
      )}
    </CompanyGuard>
  );
}
