'use client';

import { useState } from 'react';
import { Users, Plus, Edit2, Trash2, Mail, Save } from 'lucide-react';
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
import { getCollectionPointLocationLabel } from '@/lib/collection-point-location';
import { type User, type UserRole } from '@/lib/mock-data';
import { ALL_ROLES, ROLE_CONFIG } from '@/lib/roles';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function TeamManagement() {
  const { users, collectionPoints, countries, cities, zones, vehicles, addUser, updateUser, deleteUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'COLLECTOR' as UserRole,
    assignedPointId: '',
    assignedVehicleId: '',
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'ALL' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getAssignedResource = (user: User) => {
    if (user.role === 'COLLECTOR' && user.assignedPointId) {
      const point = collectionPoints.find((p) => p.id === user.assignedPointId);

      if (!point) {
        return null;
      }

      return `${point.name} - ${getCollectionPointLocationLabel(point, zones, cities, countries)}`;
    }
    if (user.role === 'TRANSPORTER' && user.assignedVehicleId) {
      const vehicle = vehicles.find((v) => v.id === user.assignedVehicleId);
      return vehicle ? `${vehicle.type} - ${vehicle.plate}` : null;
    }
    return null;
  };

  const generateAvatar = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAdd = () => {
    if (formData.name && formData.email) {
      addUser({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        avatar: generateAvatar(formData.name),
        assignedPointId: formData.role === 'COLLECTOR' ? formData.assignedPointId : undefined,
        assignedVehicleId: formData.role === 'TRANSPORTER' ? formData.assignedVehicleId : undefined,
      });
      setFormData({ name: '', email: '', role: 'COLLECTOR', assignedPointId: '', assignedVehicleId: '' });
      setIsAddDialogOpen(false);
    }
  };

  const handleEdit = () => {
    if (selectedUser && formData.name && formData.email) {
      updateUser(selectedUser.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        avatar: generateAvatar(formData.name),
        assignedPointId: formData.role === 'COLLECTOR' ? formData.assignedPointId : undefined,
        assignedVehicleId: formData.role === 'TRANSPORTER' ? formData.assignedVehicleId : undefined,
      });
      setSelectedUser(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleDelete = () => {
    if (selectedUser) {
      deleteUser(selectedUser.id);
      setSelectedUser(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      assignedPointId: user.assignedPointId || '',
      assignedVehicleId: user.assignedVehicleId || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestion d&apos;Equipe</h2>
          <p className="text-muted-foreground">Gerez les comptes admins, employes, collecteurs et transporteurs</p>
        </div>
        <Button className="gap-2" onClick={() => {
          setFormData({ name: '', email: '', role: 'COLLECTOR', assignedPointId: '', assignedVehicleId: '' });
          setIsAddDialogOpen(true);
        }}>
          <Plus className="h-4 w-4" />
          Ajouter un membre
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Input
          placeholder="Rechercher par nom ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm bg-secondary"
        />
        <div className="flex gap-2">
          <Button
            variant={filterRole === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilterRole('ALL')}
            size="sm"
          >
            Tous ({users.length})
          </Button>
          {ALL_ROLES.map((role) => {
            const config = ROLE_CONFIG[role];
            const count = users.filter((u) => u.role === role).length;
            return (
              <Button
                key={role}
                variant={filterRole === role ? 'default' : 'outline'}
                onClick={() => setFilterRole(role)}
                size="sm"
                className="gap-1"
              >
                {config.label} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total membres</p>
            </div>
          </CardContent>
        </Card>
        {ALL_ROLES.map((role) => {
          const config = ROLE_CONFIG[role];
          const Icon = config.icon;
          const count = users.filter((u) => u.role === role).length;
          return (
            <Card key={role} className="border-border bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    config.surfaceColor
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">{config.label}s</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Team Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Membre</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Role</TableHead>
                <TableHead className="text-muted-foreground">Assignation</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const roleConfig = ROLE_CONFIG[user.role];
                const Icon = roleConfig.icon;
                const assignedResource = getAssignedResource(user);

                return (
                  <TableRow key={user.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {user.avatar}
                        </div>
                        <span className="font-medium text-foreground">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium',
                          roleConfig.badgeColor
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {roleConfig.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {assignedResource || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => openDeleteDialog(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Aucun membre trouve
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
            <DialogTitle className="text-foreground">Ajouter un membre</DialogTitle>
            <DialogDescription>Remplissez les informations du nouveau membre</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Nom complet</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Jean Dupont"
                  className="bg-secondary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jean@express.com"
                  className="bg-secondary"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Role</label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_CONFIG[role].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.role === 'COLLECTOR' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Point de collecte</label>
                <Select value={formData.assignedPointId} onValueChange={(v) => setFormData({ ...formData, assignedPointId: v })}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Selectionnez un point" />
                  </SelectTrigger>
                  <SelectContent>
                    {collectionPoints.map((point) => (
                      <SelectItem key={point.id} value={point.id}>
                        {point.name} - {getCollectionPointLocationLabel(point, zones, cities, countries)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.role === 'TRANSPORTER' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Vehicule</label>
                <Select value={formData.assignedVehicleId} onValueChange={(v) => setFormData({ ...formData, assignedVehicleId: v })}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Selectionnez un vehicule" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.type} - {vehicle.plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <DialogTitle className="text-foreground">Modifier le membre</DialogTitle>
            <DialogDescription>Modifiez les informations du membre</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Nom complet</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-secondary"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Role</label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_CONFIG[role].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.role === 'COLLECTOR' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Point de collecte</label>
                <Select value={formData.assignedPointId} onValueChange={(v) => setFormData({ ...formData, assignedPointId: v })}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Selectionnez un point" />
                  </SelectTrigger>
                  <SelectContent>
                    {collectionPoints.map((point) => (
                      <SelectItem key={point.id} value={point.id}>
                        {point.name} - {getCollectionPointLocationLabel(point, zones, cities, countries)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.role === 'TRANSPORTER' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Vehicule</label>
                <Select value={formData.assignedVehicleId} onValueChange={(v) => setFormData({ ...formData, assignedVehicleId: v })}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Selectionnez un vehicule" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.type} - {vehicle.plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <DialogTitle className="text-foreground">Supprimer le membre</DialogTitle>
            <DialogDescription>
              Etes-vous sur de vouloir supprimer {selectedUser?.name} ? Cette action est irreversible.
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
