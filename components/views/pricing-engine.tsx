'use client';

import { useState } from 'react';
import { DollarSign, Plus, Edit2, Trash2, Calculator, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type PricingRule } from '@/lib/mock-data';
import { useStore } from '@/lib/store';

export function PricingEngine() {
  const { pricingRules, addPricingRule, updatePricingRule, deletePricingRule } = useStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);
  const [simulateWeight, setSimulateWeight] = useState('5');
  const [simulateDistance, setSimulateDistance] = useState('50');

  const [formData, setFormData] = useState({
    name: '',
    basePrice: '',
    pricePerKg: '',
    pricePerKm: '',
    zoneMultiplier: '1.0',
  });

  const calculatePrice = (rule: PricingRule, weight: number, distance: number) => {
    return (rule.basePrice + rule.pricePerKg * weight + rule.pricePerKm * distance) * rule.zoneMultiplier;
  };

  const handleAdd = () => {
    if (formData.name && formData.basePrice && formData.pricePerKg && formData.pricePerKm) {
      addPricingRule({
        name: formData.name,
        basePrice: parseFloat(formData.basePrice),
        pricePerKg: parseFloat(formData.pricePerKg),
        pricePerKm: parseFloat(formData.pricePerKm),
        zoneMultiplier: parseFloat(formData.zoneMultiplier) || 1.0,
      });
      setFormData({ name: '', basePrice: '', pricePerKg: '', pricePerKm: '', zoneMultiplier: '1.0' });
      setIsAddDialogOpen(false);
    }
  };

  const handleEdit = () => {
    if (selectedRule && formData.name && formData.basePrice && formData.pricePerKg && formData.pricePerKm) {
      updatePricingRule(selectedRule.id, {
        name: formData.name,
        basePrice: parseFloat(formData.basePrice),
        pricePerKg: parseFloat(formData.pricePerKg),
        pricePerKm: parseFloat(formData.pricePerKm),
        zoneMultiplier: parseFloat(formData.zoneMultiplier) || 1.0,
      });
      setSelectedRule(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleDelete = () => {
    if (selectedRule) {
      deletePricingRule(selectedRule.id);
      setSelectedRule(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openEditDialog = (rule: PricingRule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      basePrice: rule.basePrice.toString(),
      pricePerKg: rule.pricePerKg.toString(),
      pricePerKm: rule.pricePerKm.toString(),
      zoneMultiplier: rule.zoneMultiplier.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (rule: PricingRule) => {
    setSelectedRule(rule);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Moteur de Tarification</h2>
          <p className="text-muted-foreground">Configurez vos grilles de prix</p>
        </div>
        <Button className="gap-2" onClick={() => {
          setFormData({ name: '', basePrice: '', pricePerKg: '', pricePerKm: '', zoneMultiplier: '1.0' });
          setIsAddDialogOpen(true);
        }}>
          <Plus className="h-4 w-4" />
          Nouvelle tarification
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pricing Rules Table */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nom</TableHead>
                    <TableHead className="text-muted-foreground">Prix de base</TableHead>
                    <TableHead className="text-muted-foreground">Par kg</TableHead>
                    <TableHead className="text-muted-foreground">Par km</TableHead>
                    <TableHead className="text-muted-foreground">Multiplicateur</TableHead>
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingRules.map((rule) => (
                    <TableRow key={rule.id} className="border-border">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
                            <DollarSign className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{rule.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {rule.basePrice.toFixed(2)} EUR
                      </TableCell>
                      <TableCell className="text-foreground">
                        {rule.pricePerKg.toFixed(2)} EUR
                      </TableCell>
                      <TableCell className="text-foreground">
                        {rule.pricePerKm.toFixed(2)} EUR
                      </TableCell>
                      <TableCell className="text-foreground">
                        x{rule.zoneMultiplier}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(rule)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => openDeleteDialog(rule)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pricingRules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Aucune tarification configuree
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Simulator */}
        <Card className="h-fit border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/20">
                <Calculator className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <CardTitle className="text-foreground">Simulateur</CardTitle>
                <CardDescription>Calculez un tarif</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Poids (kg)</label>
              <Input
                type="number"
                value={simulateWeight}
                onChange={(e) => setSimulateWeight(e.target.value)}
                className="bg-secondary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Distance (km)</label>
              <Input
                type="number"
                value={simulateDistance}
                onChange={(e) => setSimulateDistance(e.target.value)}
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2 rounded-lg bg-secondary p-4">
              <p className="text-sm font-medium text-muted-foreground">Estimation par tarif :</p>
              {pricingRules.map((rule) => {
                const price = calculatePrice(
                  rule,
                  parseFloat(simulateWeight) || 0,
                  parseFloat(simulateDistance) || 0
                );
                return (
                  <div key={rule.id} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{rule.name}</span>
                    <span className="font-bold text-primary">{price.toFixed(2)} EUR</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nouvelle tarification</DialogTitle>
            <DialogDescription>Configurez une nouvelle grille de prix</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Nom</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Express International"
                className="bg-secondary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Prix de base (EUR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  placeholder="5.00"
                  className="bg-secondary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Prix par kg (EUR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.pricePerKg}
                  onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                  placeholder="1.50"
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Prix par km (EUR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.pricePerKm}
                  onChange={(e) => setFormData({ ...formData, pricePerKm: e.target.value })}
                  placeholder="0.10"
                  className="bg-secondary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Multiplicateur zone</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.zoneMultiplier}
                  onChange={(e) => setFormData({ ...formData, zoneMultiplier: e.target.value })}
                  placeholder="1.0"
                  className="bg-secondary"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAdd} className="gap-2">
              <Save className="h-4 w-4" />
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Modifier la tarification</DialogTitle>
            <DialogDescription>Modifiez les parametres de la tarification</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Nom</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-secondary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Prix de base (EUR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Prix par kg (EUR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.pricePerKg}
                  onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Prix par km (EUR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.pricePerKm}
                  onChange={(e) => setFormData({ ...formData, pricePerKm: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Multiplicateur zone</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.zoneMultiplier}
                  onChange={(e) => setFormData({ ...formData, zoneMultiplier: e.target.value })}
                  className="bg-secondary"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEdit} className="gap-2">
              <Save className="h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Supprimer la tarification</DialogTitle>
            <DialogDescription>
              Etes-vous sur de vouloir supprimer la tarification "{selectedRule?.name}" ? Cette action est irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
