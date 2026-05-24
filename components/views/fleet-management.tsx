'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bike,
  Car,
  Edit2,
  Package,
  Pickaxe,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Truck,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api-client';
import { getCompanyEmployees } from '@/lib/admin/api';
import {
  assignFlotteTransporters,
  createFlotte,
  deleteFlotte,
  getFlottes,
  unassignFlotteTransporter,
  updateFlotte,
  updateFlotteStatus,
} from '@/lib/company/api';
import type { UserResponse } from '@/lib/auth/types';
import type { FlotteRequest, FlotteResponse, FlotteStatus, FlotteType } from '@/lib/company/types';
import {
  CompanyGuard,
  ConfirmDialog,
  SectionHeader,
  StatusState,
  ToastBar,
  useToastSimple,
} from '@/components/company/company-shared';

const FLOTTE_TYPES: FlotteType[] = ['VAN', 'MOTO', 'CAMION', 'VOITURE', 'PICKUP', 'TRICYCLE', 'AUTRE'];
const FLOTTE_STATUSES: FlotteStatus[] = ['DISPONIBLE', 'EN_TRANSIT', 'MAINTENANCE'];

const FLOTTE_TYPE_LABELS: Record<FlotteType, string> = {
  VAN: 'Van',
  MOTO: 'Moto',
  CAMION: 'Camion',
  VOITURE: 'Voiture',
  PICKUP: 'Pickup',
  TRICYCLE: 'Tricycle',
  AUTRE: 'Autre',
};

const FLOTTE_STATUS_LABELS: Record<FlotteStatus, string> = {
  DISPONIBLE: 'Disponible',
  EN_TRANSIT: 'En transit',
  MAINTENANCE: 'Maintenance',
};

const FLOTTE_STATUS_STYLES: Record<FlotteStatus, string> = {
  DISPONIBLE: 'bg-success/15 text-success',
  EN_TRANSIT: 'bg-primary/15 text-primary',
  MAINTENANCE: 'bg-warning/15 text-warning',
};

const FLOTTE_TYPE_ICONS: Record<FlotteType, React.ElementType> = {
  VAN: Truck,
  MOTO: Bike,
  CAMION: Truck,
  VOITURE: Car,
  PICKUP: Truck,
  TRICYCLE: Pickaxe,
  AUTRE: Package,
};

type FleetFormState = {
  type: FlotteType;
  immatriculation: string;
  maxVolumeM3: string;
  maxWeightKg: string;
  status: FlotteStatus;
};

function createDefaultForm(): FleetFormState {
  return {
    type: 'VAN',
    immatriculation: '',
    maxVolumeM3: '',
    maxWeightKg: '',
    status: 'DISPONIBLE',
  };
}

function buildFormFromFlotte(flotte: FlotteResponse): FleetFormState {
  return {
    type: flotte.type,
    immatriculation: flotte.immatriculation,
    maxVolumeM3: String(flotte.maxVolumeM3),
    maxWeightKg: String(flotte.maxWeightKg),
    status: flotte.status,
  };
}

function buildFlottePayload(
  form: FleetFormState,
  transporterIds: number[] = [],
): FlotteRequest {
  return {
    type: form.type,
    immatriculation: form.immatriculation.trim(),
    maxVolumeM3: Number(form.maxVolumeM3),
    maxWeightKg: Number(form.maxWeightKg),
    status: form.status,
    transporterIds: transporterIds.length > 0 ? transporterIds : undefined,
  };
}

function FleetDialog({
  open,
  value,
  loading,
  editing,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  value: FleetFormState;
  loading: boolean;
  editing: boolean;
  onChange: (value: FleetFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Modifier le véhicule' : 'Ajouter un véhicule'}</DialogTitle>
          <DialogDescription>
            Renseignez les capacités, le type et le statut opérationnel du véhicule.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={value.type}
                onValueChange={(type: FlotteType) => onChange({ ...value, type })}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLOTTE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {FLOTTE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Immatriculation</Label>
              <Input
                value={value.immatriculation}
                onChange={(event) => onChange({ ...value, immatriculation: event.target.value })}
                className="bg-secondary"
                placeholder="LT-245-AA"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Volume max (m3)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={value.maxVolumeM3}
                onChange={(event) => onChange({ ...value, maxVolumeM3: event.target.value })}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Poids max (kg)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={value.maxWeightKg}
                onChange={(event) => onChange({ ...value, maxWeightKg: event.target.value })}
                className="bg-secondary"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select
              value={value.status}
              onValueChange={(status: FlotteStatus) => onChange({ ...value, status })}
            >
              <SelectTrigger className="bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FLOTTE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {FLOTTE_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={onSubmit}
            disabled={
              loading ||
              !value.immatriculation.trim() ||
              value.maxVolumeM3.trim() === '' ||
              value.maxWeightKg.trim() === ''
            }
          >
            {loading ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignTransportersDialog({
  open,
  transporters,
  selectedIds,
  loading,
  flotteLabel,
  onToggle,
  onClose,
  onSubmit,
}: {
  open: boolean;
  transporters: UserResponse[];
  selectedIds: number[];
  loading: boolean;
  flotteLabel: string;
  onToggle: (id: number, checked: boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Assigner des transporteurs</DialogTitle>
          <DialogDescription>
            Sélectionnez les transporteurs autorisés à opérer le véhicule {flotteLabel}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <p className="text-sm font-medium text-foreground">
              {selectedIds.length} transporteur(s) sélectionné(s)
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les affectations existantes seront remplacées par cette sélection.
            </p>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {transporters.map((transporter) => {
              const fullName = `${transporter.firstName} ${transporter.lastName}`.trim() || transporter.username;
              const checked = selectedIds.includes(transporter.id);
              return (
                <label
                  key={transporter.id}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/10 p-4"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) => onToggle(transporter.id, next === true)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{fullName}</p>
                    <p className="text-sm text-muted-foreground">@{transporter.username}</p>
                    {transporter.phone && (
                      <p className="mt-1 text-xs text-muted-foreground">{transporter.phone}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FleetManagementInner({ companyId, companyName }: { companyId: number; companyName: string }) {
  const token = useAuthStore((state) => state.token);
  const { toast, success, error: showError } = useToastSimple();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FlotteStatus>('ALL');
  const [flottes, setFlottes] = useState<FlotteResponse[]>([]);
  const [transporters, setTransporters] = useState<UserResponse[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FlotteResponse | null>(null);
  const [editingFlotte, setEditingFlotte] = useState<FlotteResponse | null>(null);
  const [assigningFlotte, setAssigningFlotte] = useState<FlotteResponse | null>(null);
  const [selectedTransporterIds, setSelectedTransporterIds] = useState<number[]>([]);
  const [actionFlotteId, setActionFlotteId] = useState<number | null>(null);
  const [form, setForm] = useState<FleetFormState>(createDefaultForm());

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [flottesData, employees] = await Promise.all([
        getFlottes(token, companyId),
        getCompanyEmployees(token, companyId),
      ]);
      setFlottes(flottesData);
      setTransporters(employees.filter((user) => user.role === 'TRANSPORTER'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [token, companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredFlottes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return flottes.filter((flotte) => {
      const matchesStatus = statusFilter === 'ALL' || flotte.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      return (
        flotte.immatriculation.toLowerCase().includes(query) ||
        FLOTTE_TYPE_LABELS[flotte.type].toLowerCase().includes(query) ||
        flotte.transporters.some((transporter) =>
          `${transporter.firstName} ${transporter.lastName}`.trim().toLowerCase().includes(query),
        )
      );
    });
  }, [flottes, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: flottes.length,
      available: flottes.filter((flotte) => flotte.status === 'DISPONIBLE').length,
      transit: flottes.filter((flotte) => flotte.status === 'EN_TRANSIT').length,
      maintenance: flottes.filter((flotte) => flotte.status === 'MAINTENANCE').length,
    }),
    [flottes],
  );

  const openCreateDialog = () => {
    setEditingFlotte(null);
    setForm(createDefaultForm());
    setDialogOpen(true);
  };

  const openEditDialog = (flotte: FlotteResponse) => {
    setEditingFlotte(flotte);
    setForm(buildFormFromFlotte(flotte));
    setDialogOpen(true);
  };

  const openAssignDialog = (flotte: FlotteResponse) => {
    setAssigningFlotte(flotte);
    setSelectedTransporterIds(flotte.transporters.map((transporter) => transporter.id));
    setAssignDialogOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const payload = buildFlottePayload(form);
      const saved = editingFlotte
        ? await updateFlotte(token, companyId, editingFlotte.id, payload)
        : await createFlotte(token, companyId, payload);
      setFlottes((current) =>
        editingFlotte
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      success(editingFlotte ? 'Véhicule mis à jour' : 'Véhicule créé');
      setDialogOpen(false);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    setSaving(true);
    try {
      await deleteFlotte(token, companyId, deleteTarget.id);
      setFlottes((current) => current.filter((item) => item.id !== deleteTarget.id));
      success('Véhicule supprimé');
      setDeleteTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Suppression impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!token || !assigningFlotte) return;
    setSaving(true);
    try {
      let saved: FlotteResponse;
      if (selectedTransporterIds.length === 0) {
        saved = assigningFlotte;
        for (const transporter of assigningFlotte.transporters) {
          saved = await unassignFlotteTransporter(token, companyId, assigningFlotte.id, transporter.id);
        }
      } else {
        saved = await assignFlotteTransporters(
          token,
          companyId,
          assigningFlotte.id,
          selectedTransporterIds,
        );
      }
      setFlottes((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      success(selectedTransporterIds.length === 0 ? 'Transporteurs retirés' : 'Transporteurs assignés');
      setAssignDialogOpen(false);
      setAssigningFlotte(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Assignation impossible');
    } finally {
      setSaving(false);
    }
  };

  const cycleStatus = async (flotte: FlotteResponse) => {
    if (!token) return;
    const nextStatus: FlotteStatus =
      flotte.status === 'DISPONIBLE'
        ? 'EN_TRANSIT'
        : flotte.status === 'EN_TRANSIT'
          ? 'MAINTENANCE'
          : 'DISPONIBLE';

    setActionFlotteId(flotte.id);
    try {
      const saved = await updateFlotteStatus(token, companyId, flotte.id, nextStatus);
      setFlottes((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      success(`Statut mis à jour: ${FLOTTE_STATUS_LABELS[nextStatus]}`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Mise à jour du statut impossible');
    } finally {
      setActionFlotteId(null);
    }
  };

  const toggleTransporter = (id: number, checked: boolean) => {
    setSelectedTransporterIds((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <StatusState
        icon={Truck}
        tone="destructive"
        title="Erreur de chargement"
        description={error}
        action={
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <ToastBar toast={toast} />

      <FleetDialog
        open={dialogOpen}
        value={form}
        loading={saving}
        editing={!!editingFlotte}
        onChange={setForm}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSave}
      />

      <AssignTransportersDialog
        open={assignDialogOpen}
        transporters={transporters}
        selectedIds={selectedTransporterIds}
        loading={saving}
        flotteLabel={assigningFlotte?.immatriculation ?? ''}
        onToggle={toggleTransporter}
        onClose={() => {
          setAssignDialogOpen(false);
          setAssigningFlotte(null);
          setSelectedTransporterIds([]);
        }}
        onSubmit={handleAssign}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer le véhicule"
        description={`Le véhicule ${deleteTarget?.immatriculation ?? ''} sera supprimé définitivement.`}
        confirmLabel="Supprimer"
        destructive
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <SectionHeader
        title="Gestion de flotte"
        subtitle={`Pilotage mobile-friendly des véhicules de ${companyName}.`}
        action={
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un véhicule
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-primary/15 p-3 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Véhicules</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-success/15 p-3 text-success">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.available}</p>
              <p className="text-sm text-muted-foreground">Disponibles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-primary/15 p-3 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.transit}</p>
              <p className="text-sm text-muted-foreground">En transit</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-warning/15 p-3 text-warning">
              <Pickaxe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.maintenance}</p>
              <p className="text-sm text-muted-foreground">Maintenance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une immatriculation, un type ou un transporteur..."
              className="bg-secondary"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'ALL' | FlotteStatus)}
            >
              <SelectTrigger className="w-full bg-secondary md:w-64">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {FLOTTE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {FLOTTE_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredFlottes.length === 0 ? (
            <StatusState
              icon={Truck}
              title={flottes.length === 0 ? 'Aucun véhicule' : 'Aucun résultat'}
              description={
                flottes.length === 0
                  ? 'Ajoutez votre premier véhicule pour commencer la gestion de flotte.'
                  : 'Aucun véhicule ne correspond à votre recherche.'
              }
              action={
                flottes.length === 0 ? (
                  <Button onClick={openCreateDialog} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Ajouter un véhicule
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredFlottes.map((flotte) => {
                const Icon = FLOTTE_TYPE_ICONS[flotte.type];
                return (
                  <div key={flotte.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div className="rounded-xl bg-primary/15 p-3 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{flotte.immatriculation}</p>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${FLOTTE_STATUS_STYLES[flotte.status]}`}>
                              {FLOTTE_STATUS_LABELS[flotte.status]}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{FLOTTE_TYPE_LABELS[flotte.type]}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {flotte.maxVolumeM3} m3 • {flotte.maxWeightKg} kg
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(flotte)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(flotte)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl bg-secondary/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Users className="h-4 w-4" />
                            Transporteurs assignés
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {flotte.transporterCount}
                          </span>
                        </div>
                        {flotte.transporters.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {flotte.transporters.map((transporter) => (
                              <span
                                key={transporter.id}
                                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground"
                              >
                                {`${transporter.firstName} ${transporter.lastName}`.trim() || transporter.username}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">Aucun transporteur affecté.</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => openAssignDialog(flotte)} className="gap-2">
                          <UserPlus className="h-4 w-4" />
                          Affecter
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => cycleStatus(flotte)}
                          className="gap-2"
                          disabled={actionFlotteId === flotte.id}
                        >
                          <RefreshCw className={`h-4 w-4 ${actionFlotteId === flotte.id ? 'animate-spin' : ''}`} />
                          Changer le statut
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function FleetManagement() {
  return (
    <CompanyGuard>
      {({ companyId, company }) => (
        <FleetManagementInner companyId={companyId} companyName={company.name} />
      )}
    </CompanyGuard>
  );
}
