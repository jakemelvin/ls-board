'use client';

import { useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type CollectionPoint } from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function CollectionPointsView() {
  const { collectionPoints, users, addCollectionPoint, updateCollectionPoint, deleteCollectionPoint } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<CollectionPoint | null>(null);

  const collectors = users.filter((u) => u.role === 'COLLECTOR');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    capacity: '',
    currentStock: '0',
    responsibleId: '',
  });

  const filteredPoints = collectionPoints.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getResponsible = (responsibleId: string) => {
    return users.find((u) => u.id === responsibleId);
  };

  const handleAdd = () => {
    if (formData.name && formData.address && formData.city && formData.capacity) {
      addCollectionPoint({
        name: formData.name,
        address: formData.address,
        city: formData.city,
        capacity: parseInt(formData.capacity),
        currentStock: parseInt(formData.currentStock) || 0,
        responsibleId: formData.responsibleId,
      });
      setFormData({ name: '', address: '', city: '', capacity: '', currentStock: '0', responsibleId: '' });
      setIsAddDialogOpen(false);
    }
  };

  const handleEdit = () => {
    if (selectedPoint && formData.name && formData.address && formData.city && formData.capacity) {
      updateCollectionPoint(selectedPoint.id, {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        capacity: parseInt(formData.capacity),
        currentStock: parseInt(formData.currentStock),
        responsibleId: formData.responsibleId,
      });
      setSelectedPoint(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleDelete = () => {
    if (selectedPoint) {
      deleteCollectionPoint(selectedPoint.id);
      setSelectedPoint(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openEditDialog = (point: CollectionPoint) => {
    setSelectedPoint(point);
    setFormData({
      name: point.name,
      address: point.address,
      city: point.city,
      capacity: point.capacity.toString(),
      currentStock: point.currentStock.toString(),
      responsibleId: point.responsibleId,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (point: CollectionPoint) => {
    setSelectedPoint(point);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Points de Collecte</h2>
          <p className="text-muted-foreground">Annuaire des points, stocks et responsables</p>
        </div>
        <Button className="gap-2" onClick={() => {
          setFormData({ name: '', address: '', city: '', capacity: '', currentStock: '0', responsibleId: '' });
          setIsAddDialogOpen(true);
        }}>
          <Plus className="h-4 w-4" />
          Ajouter un point
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Rechercher par nom ou ville..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm bg-secondary"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{collectionPoints.length}</p>
              <p className="text-xs text-muted-foreground">Total points</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">Colis en stock</span>
            <span className="text-2xl font-bold text-foreground">
              {collectionPoints.reduce((sum, p) => sum + p.currentStock, 0)}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">Capacite totale</span>
            <span className="text-2xl font-bold text-foreground">
              {collectionPoints.reduce((sum, p) => sum + p.capacity, 0)}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">Saturation moyenne</span>
            <span className="text-2xl font-bold text-foreground">
              {collectionPoints.length > 0
                ? Math.round(
                    (collectionPoints.reduce((sum, p) => sum + p.currentStock, 0) /
                      collectionPoints.reduce((sum, p) => sum + p.capacity, 0)) *
                      100
                  )
                : 0}
              %
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Points Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Nom</TableHead>
                <TableHead className="text-muted-foreground">Adresse</TableHead>
                <TableHead className="text-muted-foreground">Ville</TableHead>
                <TableHead className="text-muted-foreground">Stock</TableHead>
                <TableHead className="text-muted-foreground">Saturation</TableHead>
                <TableHead className="text-muted-foreground">Responsable</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPoints.map((point) => {
                const saturation = Math.round((point.currentStock / point.capacity) * 100);
                const responsible = getResponsible(point.responsibleId);

                return (
                  <TableRow key={point.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{point.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{point.address}</TableCell>
                    <TableCell className="text-foreground">{point.city}</TableCell>
                    <TableCell className="text-foreground">
                      {point.currentStock} / {point.capacity}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn(
                              'h-full transition-all',
                              saturation > 80
                                ? 'bg-destructive'
                                : saturation > 50
                                ? 'bg-warning'
                                : 'bg-success'
                            )}
                            style={{ width: `${saturation}%` }}
                          />
                        </div>
                        <span className="text-sm text-foreground">{saturation}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {responsible ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {responsible.avatar}
                          </div>
                          <span className="text-sm text-foreground">{responsible.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Non assigne</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(point)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => openDeleteDialog(point)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredPoints.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Aucun point trouve
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Ajouter un point de collecte</DialogTitle>
            <DialogDescription>Remplissez les informations du nouveau point</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Nom</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Pharmacie du Centre"
                className="bg-secondary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Adresse</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="15 Rue de la Paix"
                className="bg-secondary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Ville</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Paris"
                  className="bg-secondary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Capacite</label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="100"
                  className="bg-secondary"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Responsable</label>
              <Select value={formData.responsibleId} onValueChange={(v) => setFormData({ ...formData, responsibleId: v })}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Selectionnez un responsable" />
                </SelectTrigger>
                <SelectContent>
                  {collectors.map((collector) => (
                    <SelectItem key={collector.id} value={collector.id}>
                      {collector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogTitle className="text-foreground">Modifier le point de collecte</DialogTitle>
            <DialogDescription>Modifiez les informations du point</DialogDescription>
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
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Adresse</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-secondary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Ville</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Capacite</label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="bg-secondary"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Stock actuel</label>
              <Input
                type="number"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                className="bg-secondary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Responsable</label>
              <Select value={formData.responsibleId} onValueChange={(v) => setFormData({ ...formData, responsibleId: v })}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Selectionnez un responsable" />
                </SelectTrigger>
                <SelectContent>
                  {collectors.map((collector) => (
                    <SelectItem key={collector.id} value={collector.id}>
                      {collector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogTitle className="text-foreground">Supprimer le point</DialogTitle>
            <DialogDescription>
              Etes-vous sur de vouloir supprimer {selectedPoint?.name} ? Cette action est irreversible.
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
