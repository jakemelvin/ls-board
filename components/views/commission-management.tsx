'use client';

import { useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { CheckCircle2, Coins, Search, UserCheck, WalletCards } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardPeriodFilter } from '@/components/dashboard-period-filter';
import {
  getCommissionRoleLabel,
  getCommissionStatusClassName,
  getCommissionStatusLabel,
  getCommissionSummary,
} from '@/lib/commissions';
import { useCurrency } from '@/lib/currency';
import {
  getDashboardPeriodRange,
  isDateInRange,
  type DashboardPeriodPreset,
  type DateRange,
} from '@/lib/dashboard-period';
import type { CommissionBeneficiaryRole, CommissionEntry, CommissionStatus } from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type StatusFilter = CommissionStatus | 'ALL';
type RoleFilter = CommissionBeneficiaryRole | 'ALL';

export function CommissionManagement() {
  const { formatMoney } = useCurrency();
  const { commissions, markCommissionAsPaid, markCommissionAsPayable } = useStore();
  const referenceDate = useMemo(() => getLatestCommissionDate(commissions), [commissions]);
  const [periodPreset, setPeriodPreset] = useState<DashboardPeriodPreset>('CURRENT_MONTH');
  const [periodRange, setPeriodRange] = useState<DateRange>(() =>
    getDashboardPeriodRange('CURRENT_MONTH', referenceDate)
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingCommission, setPendingCommission] = useState<CommissionEntry | null>(null);

  const filteredCommissions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return commissions
      .filter((commission) => isDateInRange(commission.earnedAt, periodRange))
      .filter((commission) => statusFilter === 'ALL' || commission.status === statusFilter)
      .filter((commission) => roleFilter === 'ALL' || commission.beneficiaryRole === roleFilter)
      .filter((commission) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          commission.beneficiaryName,
          commission.trackingNumber,
          commission.sourceCollectionPointName,
          commission.sourceVehicleLabel,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedSearch));
      })
      .sort((left, right) => right.earnedAt.getTime() - left.earnedAt.getTime());
  }, [commissions, periodRange, roleFilter, searchTerm, statusFilter]);

  const summary = getCommissionSummary(filteredCommissions);

  const handlePeriodChange = (preset: DashboardPeriodPreset, range: DateRange) => {
    setPeriodPreset(preset);
    setPeriodRange(range);
  };

  const handleConfirmPayment = () => {
    if (!pendingCommission) {
      return;
    }

    markCommissionAsPaid(pendingCommission.id);
    setPendingCommission(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Commissions</h2>
          <p className="text-muted-foreground">
            Suivez les commissions collecteurs et transporteurs a payer ou deja payees.
          </p>
        </div>
        <DashboardPeriodFilter
          preset={periodPreset}
          range={periodRange}
          referenceDate={referenceDate}
          onChange={handlePeriodChange}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="A payer"
          value={formatMoney(summary.payableAmount)}
          description={`${summary.payableCount} commission(s)`}
          icon={WalletCards}
          tone="warning"
        />
        <SummaryCard
          title="Deja paye"
          value={formatMoney(summary.paidAmount)}
          description={`${summary.paidCount} commission(s)`}
          icon={CheckCircle2}
          tone="success"
        />
        <SummaryCard
          title="Collecteurs"
          value={formatMoney(summary.collectorAmount)}
          description="Total sur la periode"
          icon={UserCheck}
          tone="primary"
        />
        <SummaryCard
          title="Transporteurs"
          value={formatMoney(summary.transporterAmount)}
          description="Total sur la periode"
          icon={Coins}
          tone="chart"
        />
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="space-y-4">
          <div>
            <CardTitle className="text-foreground">Tableau des commissions</CardTitle>
            <CardDescription>
              Filtrez par statut, role, periode ou numero de suivi.
            </CardDescription>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher un beneficiaire, un point, un vehicule ou un suivi..."
                className="bg-secondary pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous statuts</SelectItem>
                <SelectItem value="PAYABLE">A payer</SelectItem>
                <SelectItem value="PAID">Payees</SelectItem>
                <SelectItem value="CANCELED">Annulees</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(value: RoleFilter) => setRoleFilter(value)}>
              <SelectTrigger className="bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous roles</SelectItem>
                <SelectItem value="COLLECTOR">Collecteurs</SelectItem>
                <SelectItem value="TRANSPORTER">Transporteurs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Beneficiaire</TableHead>
                <TableHead className="text-muted-foreground">Colis</TableHead>
                <TableHead className="text-muted-foreground">Source</TableHead>
                <TableHead className="text-muted-foreground">Calcul</TableHead>
                <TableHead className="text-muted-foreground">Statut</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCommissions.map((commission) => (
                <TableRow key={commission.id} className="border-border">
                  <TableCell>
                    <p className="font-medium text-foreground">{commission.beneficiaryName}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCommissionRoleLabel(commission.beneficiaryRole)}
                    </p>
                  </TableCell>
                  <TableCell className="font-mono text-foreground">
                    {commission.trackingNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {commission.sourceCollectionPointName ??
                      commission.sourceVehicleLabel ??
                      'Source indisponible'}
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-foreground">
                      {formatMoney(commission.commissionAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {commission.rate}% de {formatMoney(commission.baseAmount)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('border-0', getCommissionStatusClassName(commission.status))}>
                      {getCommissionStatusLabel(commission.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <p>{commission.earnedAt.toLocaleDateString('fr-FR')}</p>
                    {commission.paidAt && (
                      <p className="text-xs">Payee le {commission.paidAt.toLocaleDateString('fr-FR')}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {commission.status === 'PAYABLE' ? (
                      <Button size="sm" className="gap-2" onClick={() => setPendingCommission(commission)}>
                        <CheckCircle2 className="h-4 w-4" />
                        Marquer payee
                      </Button>
                    ) : commission.status === 'PAID' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markCommissionAsPayable(commission.id)}
                      >
                        Remettre a payer
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {filteredCommissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Aucune commission ne correspond aux filtres.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(pendingCommission)} onOpenChange={(open) => !open && setPendingCommission(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le paiement</DialogTitle>
            <DialogDescription>
              Cette action marquera la commission de {pendingCommission?.beneficiaryName} comme payee.
            </DialogDescription>
          </DialogHeader>
          {pendingCommission && (
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <p className="text-sm text-muted-foreground">Montant a payer</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {formatMoney(pendingCommission.commissionAmount)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Colis {pendingCommission.trackingNumber} - {pendingCommission.rate}% de{' '}
                {formatMoney(pendingCommission.baseAmount)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingCommission(null)}>
              Annuler
            </Button>
            <Button onClick={handleConfirmPayment}>Confirmer le paiement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: ElementType;
  tone: 'primary' | 'success' | 'warning' | 'chart';
}) {
  const toneClassName = {
    primary: 'bg-primary/20 text-primary',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    chart: 'bg-chart-2/20 text-chart-2',
  }[tone];

  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', toneClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function getLatestCommissionDate(commissions: CommissionEntry[]) {
  return (
    commissions.reduce<Date | null>((latestDate, commission) => {
      if (!latestDate || commission.earnedAt.getTime() > latestDate.getTime()) {
        return commission.earnedAt;
      }

      return latestDate;
    }, null) ?? new Date()
  );
}
