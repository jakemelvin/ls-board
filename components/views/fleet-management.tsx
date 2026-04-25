'use client';

import { useState } from 'react';
import { Truck, Bike, Plane, Plus, Edit2, Trash2, X, Save, UserPlus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getVehicleTypeLabel,
  getVehicleStatusLabel,
  getVehicleStatusColor,
  type Vehicle,
  type VehicleType,
  type VehicleStatus,
} from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const VEHICLE_ICONS: Record<VehicleType, React.ElementType> = {
  MOTO: Bike,
  VAN: Truck,
  CAMION: Truck,
  AVION: Plane,
};

const VEHICLE_TYPES: VehicleType[] = ['MOTO', 'VAN', 'CAMION', 'AVION'];
const VEHICLE_STATUSES: VehicleStatus[] = ['AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE'];

export function FleetManagement() {
  const { vehicles, users, addVehicle, updateVehicle, deleteVehicle, assignVehicleToTransporter } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'VAN' as VehicleType,
    plate: '',
    maxVolume: '',
    maxWeight: '',
    status: 'AVAILABLE' as VehicleStatus,
  });

  const transporters = users.filter((u) => u.role === 'TRANSPORTER');

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getVehicleTypeLabel(v.type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAssignedTransporter = (transporterId?: string) => {
    if (!transporterId) return null;
    return users.find((u) => u.id === transporterId);
  };

  const handleAdd = () => {
    if (formData.plate && formData.maxVolume && formData.maxWeight) {
      addVehicle({
        type: formData.type,
        plate: formData.plate,
        maxVolume: parseFloat(formData.maxVolume),
        maxWeight: parseFloat(formData.maxWeight),
        status: formData.status,
      });
      setFormData({ type: 'VAN', plate: '', maxVolume: '', maxWeight: '', status: 'AVAILABLE' });
      setIsAddDialogOpen(false);
    }
  };

  const handleEdit = () => {
    if (selectedVehicle && formData.plate && formData.maxVolume && formData.maxWeight) {
      updateVehicle(selectedVehicle.id, {
        type: formData.type,
        plate: formData.plate,
        maxVolume: parseFloat(formData.maxVolume),
        maxWeight: parseFloat(formData.maxWeight),
        status: formData.status,
      });
      setSelectedVehicle(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleDelete = () => {
    if (selectedVehicle) {
      deleteVehicle(selectedVehicle.id);
      setSelectedVehicle(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleAssign = (transporterId: string) => {
    if (selectedVehicle) {
      assignVehicleToTransporter(selectedVehicle.id, transporterId === 'none' ? '' : transporterId);
      setSelectedVehicle(null);
      setIsAssignDialogOpen(false);
    }
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      type: vehicle.type,
      plate: vehicle.plate,
      maxVolume: vehicle.maxVolume.toString(),
      maxWeight: vehicle.maxWeight.toString(),
      status: vehicle.status,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteDialogOpen(true);
  };

  const openAssignDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsAssignDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestion de la Flotte</h2>
          <p className="text-muted-foreground">Gerez vos vehicules et leurs assignations</p>
        </div>
        <Button className="gap-2" onClick={() => {
          setFormData({ type: 'VAN', plate: '', maxVolume: '', maxWeight: '', status: 'AVAILABLE' });
          setIsAddDialogOpen(true);
        }}>
          <Plus className="h-4 w-4" />
          Ajouter un vehicule
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card md:col-span-1">
          <CardContent className="p-4">
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-secondary"
            />
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-foreground">{vehicles.length}</span>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">Disponibles</span>
            <span className="text-2xl font-bold text-success">
              {vehicles.filter((v) => v.status === 'AVAILABLE').length}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">En maintenance</span>
            <span className="text-2xl font-bold text-destructive">
              {vehicles.filter((v) => v.status === 'MAINTENANCE').length}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Vehicles Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Immatriculation</TableHead>
                <TableHead className="text-muted-foreground">Volume Max</TableHead>
                <TableHead className="text-muted-foreground">Poids Max</TableHead>
                <TableHead className="text-muted-foreground">Statut</TableHead>
                <TableHead className="text-muted-foreground">Assigne a</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => {
                const Icon = VEHICLE_ICONS[vehicle.type];
                const transporter = getAssignedTransporter(vehicle.assignedTransporterId);

                return (
                  <TableRow key={vehicle.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">
                          {getVehicleTypeLabel(vehicle.type)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-foreground">{vehicle.plate}</TableCell>
                    <TableCell className="text-foreground">{vehicle.maxVolume} m3</TableCell>
                    <TableCell className="text-foreground">{vehicle.maxWeight} kg</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-lg px-2 py-1 text-xs font-medium',
                          getVehicleStatusColor(vehicle.status)
                        )}
                      >
                        {getVehicleStatusLabel(vehicle.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {transporter ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {transporter.avatar}
                          </div>
                          <span className="text-sm text-foreground">{transporter.name}</span>
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
                          onClick={() => openAssignDialog(vehicle)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(vehicle)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => openDeleteDialog(vehicle)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredVehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Aucun vehicule trouve
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
            <DialogTitle className="text-foreground">Ajouter un vehicule</DialogTitle>
            <DialogDescription>Remplissez les informations du nouveau vehicule</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Type</label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as VehicleType })}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {getVehicleTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Immatriculation</label>
                <Input
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                  placeholder="AB-123-CD"
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Volume Max (m3)</label>
                <Input
                  type="number"
                  value={formData.maxVolume}
                  onChange={(e) => setFormData({ ...formData, maxVolume: e.target.value })}
                  placeholder="12"
                  className="bg-secondary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Poids Max (kg)</label>
                <Input
                  type="number"
                  value={formData.maxWeight}
                  onChange={(e) => setFormData({ ...formData, maxWeight: e.target.value })}
                  placeholder="1500"
                  className="bg-secondary"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Statut</label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as VehicleStatus })}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getVehicleStatusLabel(status)}
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
            <DialogTitle className="text-foreground">Modifier le vehicule</DialogTitle>
            <DialogDescription>Modifiez les informations du vehicule</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Type</label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as VehicleType })}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {getVehicleTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Immatriculation</label>
                <Input
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Volume Max (m3)</label>
                <Input
                  type="number"
                  value={formData.maxVolume}
                  onChange={(e) => setFormData({ ...formData, maxVolume: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Poids Max (kg)</label>
                <Input
                  type="number"
                  value={formData.maxWeight}
                  onChange={(e) => setFormData({ ...formData, maxWeight: e.target.value })}
                  className="bg-secondary"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Statut</label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as VehicleStatus })}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getVehicleStatusLabel(status)}
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
            <DialogTitle className="text-foreground">Supprimer le vehicule</DialogTitle>
            <DialogDescription>
              Etes-vous sur de vouloir supprimer le vehicule {selectedVehicle?.plate} ? Cette action est irreversible.
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

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Assigner un transporteur</DialogTitle>
            <DialogDescription>
              Selectionnez un transporteur pour le vehicule {selectedVehicle?.plate}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              defaultValue={selectedVehicle?.assignedTransporterId || 'none'}
              onValueChange={handleAssign}
            >
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Selectionnez un transporteur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {transporters.map((transporter) => (
                  <SelectItem key={transporter.id} value={transporter.id}>
                    {transporter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
