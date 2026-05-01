'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import {
  Briefcase,
  Camera,
  Edit2,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCollectionPointLocationLabel } from '@/lib/collection-point-location';
import { type User, type UserRole, type UserStatus } from '@/lib/mock-data';
import { ALL_ROLES, ROLE_CONFIG } from '@/lib/roles';
import {
  formatTransporterCommission,
  isValidOptionalCommissionRate,
} from '@/lib/transporter-commission';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface UserFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryId: string;
  cityId: string;
  address: string;
  username: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  profilePhotoUrl: string;
  assignedPointId: string;
  assignedVehicleId: string;
  transporterCommissionRate: string;
}

const userStatusLabels: Record<UserStatus, string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  INACTIVE: 'Inactif',
};

const userStatusStyles: Record<UserStatus, string> = {
  ACTIVE: 'bg-success/20 text-success',
  SUSPENDED: 'bg-warning/20 text-warning',
  INACTIVE: 'bg-muted text-muted-foreground',
};

const initialFormState: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  countryId: '',
  cityId: '',
  address: '',
  username: '',
  password: '',
  role: 'EMPLOYEE',
  status: 'ACTIVE',
  profilePhotoUrl: '',
  assignedPointId: '',
  assignedVehicleId: '',
  transporterCommissionRate: '',
};

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Invalid file payload'));
    };

    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

function buildDisplayName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

function generateAvatar(firstName: string, lastName: string) {
  return [firstName, lastName]
    .map((part) => part.trim()[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function mapUserToForm(user: User): UserFormState {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    countryId: user.countryId,
    cityId: user.cityId,
    address: user.address ?? '',
    username: user.username,
    password: user.password,
    role: user.role,
    status: user.status,
    profilePhotoUrl: user.profilePhotoUrl ?? '',
    assignedPointId: user.assignedPointId ?? '',
    assignedVehicleId: user.assignedVehicleId ?? '',
    transporterCommissionRate: user.transporterCommissionRate?.toString() ?? '',
  };
}

export function TeamManagement() {
  const {
    users,
    collectionPoints,
    countries,
    cities,
    zones,
    vehicles,
    addUser,
    updateUser,
    updateUserPassword,
    setUserStatus,
    deleteUser,
  } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormState>(initialFormState);
  const [passwordInput, setPasswordInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredUsers = users.filter((user) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      user.phone.toLowerCase().includes(query);
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  const availableCities = useMemo(
    () => (formData.countryId ? cities.filter((city) => city.countryId === formData.countryId) : []),
    [cities, formData.countryId]
  );

  const getAssignedResource = (user: User) => {
    if (user.role === 'COLLECTOR' && user.assignedPointId) {
      const point = collectionPoints.find((item) => item.id === user.assignedPointId);
      return point
        ? `${point.name} - ${getCollectionPointLocationLabel(point, zones, cities, countries)}`
        : null;
    }

    if (user.role === 'TRANSPORTER' && user.assignedVehicleId) {
      const vehicle = vehicles.find((item) => item.id === user.assignedVehicleId);
      return vehicle ? `${vehicle.type} - ${vehicle.plate}` : null;
    }

    return null;
  };

  const getLocationLabel = (user: User) => {
    const country = countries.find((item) => item.id === user.countryId);
    const city = cities.find((item) => item.id === user.cityId);
    return [city?.name, country?.name].filter(Boolean).join(', ');
  };

  const resetDialogs = () => {
    setSelectedUser(null);
    setFormData(initialFormState);
    setPasswordInput('');
    setPhoneInput('');
    setPhotoError(null);
    setFormError(null);
  };

  const validateForm = (mode: 'create' | 'edit') => {
    const hasBaseFields =
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.email.trim() &&
      formData.phone.trim() &&
      formData.countryId &&
      formData.cityId &&
      formData.username.trim();

    if (!hasBaseFields) {
      setFormError('Renseignez tous les champs obligatoires du profil utilisateur.');
      return false;
    }

    if (mode === 'create' && !formData.password.trim()) {
      setFormError('Le mot de passe est obligatoire a la creation.');
      return false;
    }

    if (formData.role === 'COLLECTOR' && !formData.assignedPointId) {
      setFormError('Selectionnez un point de collecte pour ce collecteur.');
      return false;
    }

    if (formData.role === 'TRANSPORTER' && !formData.assignedVehicleId) {
      setFormError('Selectionnez un vehicule pour ce transporteur.');
      return false;
    }

    if (formData.role === 'TRANSPORTER' && !isValidOptionalCommissionRate(formData.transporterCommissionRate)) {
      setFormError('La commission transporteur doit etre comprise entre 0 et 100%.');
      return false;
    }

    setFormError(null);
    return true;
  };

  const buildUserPayload = () => ({
    name: buildDisplayName(formData.firstName, formData.lastName),
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    email: formData.email.trim(),
    phone: formData.phone.trim(),
    countryId: formData.countryId,
    cityId: formData.cityId,
    address: formData.address.trim() || undefined,
    username: formData.username.trim(),
    password: formData.password,
    role: formData.role,
    status: formData.status,
    avatar: generateAvatar(formData.firstName, formData.lastName),
    profilePhotoUrl: formData.profilePhotoUrl || undefined,
    assignedPointId: formData.role === 'COLLECTOR' ? formData.assignedPointId : undefined,
    assignedVehicleId: formData.role === 'TRANSPORTER' ? formData.assignedVehicleId : undefined,
    transporterCommissionRate:
      formData.role === 'TRANSPORTER' && formData.transporterCommissionRate.trim() !== ''
        ? Number(formData.transporterCommissionRate)
        : undefined,
  });

  const handleAdd = () => {
    if (!validateForm('create')) {
      return;
    }

    addUser(buildUserPayload());
    setIsAddDialogOpen(false);
    resetDialogs();
  };

  const handleEditProfile = () => {
    if (!selectedUser || !validateForm('edit')) {
      return;
    }

    const payload = buildUserPayload();
    updateUser(selectedUser.id, {
      ...payload,
      password: selectedUser.password,
    });
    setIsEditDialogOpen(false);
    resetDialogs();
  };

  const handlePasswordChange = () => {
    if (!selectedUser || !passwordInput.trim()) {
      return;
    }

    updateUserPassword(selectedUser.id, passwordInput.trim());
    setIsPasswordDialogOpen(false);
    resetDialogs();
  };

  const handlePhoneChange = () => {
    if (!selectedUser || !phoneInput.trim()) {
      return;
    }

    updateUser(selectedUser.id, { phone: phoneInput.trim() });
    setIsPhoneDialogOpen(false);
    resetDialogs();
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedUser) {
      return;
    }

    try {
      const photoUrl = await fileToDataUrl(file);
      updateUser(selectedUser.id, { profilePhotoUrl: photoUrl });
      setIsPhotoDialogOpen(false);
      resetDialogs();
    } catch {
      setPhotoError("Impossible de charger la photo pour l'instant.");
    } finally {
      event.target.value = '';
    }
  };

  const handleDelete = () => {
    if (!selectedUser) {
      return;
    }

    deleteUser(selectedUser.id);
    setIsDeleteDialogOpen(false);
    resetDialogs();
  };

  const openAddDialog = () => {
    setFormData(initialFormState);
    setFormError(null);
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData(mapUserToForm(user));
    setFormError(null);
    setIsEditDialogOpen(true);
  };

  const openPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setPasswordInput('');
    setIsPasswordDialogOpen(true);
  };

  const openPhoneDialog = (user: User) => {
    setSelectedUser(user);
    setPhoneInput(user.phone);
    setIsPhoneDialogOpen(true);
  };

  const openPhotoDialog = (user: User) => {
    setSelectedUser(user);
    setPhotoError(null);
    setIsPhotoDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const renderUserForm = (mode: 'create' | 'edit') => (
    <div className="space-y-4 py-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Nom</label>
          <Input
            value={formData.lastName}
            onChange={(event) => setFormData({ ...formData, lastName: event.target.value })}
            placeholder="Dupont"
            className="bg-secondary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Prenom</label>
          <Input
            value={formData.firstName}
            onChange={(event) => setFormData({ ...formData, firstName: event.target.value })}
            placeholder="Marie"
            className="bg-secondary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(event) => setFormData({ ...formData, email: event.target.value })}
            placeholder="marie@express.com"
            className="bg-secondary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Telephone</label>
          <Input
            value={formData.phone}
            onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
            placeholder="+33 6 00 00 00 00"
            className="bg-secondary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Pays</label>
          <Select
            value={formData.countryId}
            onValueChange={(value) =>
              setFormData({ ...formData, countryId: value, cityId: '' })
            }
          >
            <SelectTrigger className="bg-secondary">
              <SelectValue placeholder="Selectionnez un pays" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.id} value={country.id}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Ville</label>
          <Select
            value={formData.cityId}
            onValueChange={(value) => setFormData({ ...formData, cityId: value })}
            disabled={!formData.countryId}
          >
            <SelectTrigger className="bg-secondary">
              <SelectValue placeholder="Selectionnez une ville" />
            </SelectTrigger>
            <SelectContent>
              {availableCities.map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Adresse <span className="text-muted-foreground">(optionnel)</span>
        </label>
        <Textarea
          value={formData.address}
          onChange={(event) => setFormData({ ...formData, address: event.target.value })}
          placeholder="Rue, quartier, bureau..."
          className="min-h-[88px] resize-none bg-secondary"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Nom d'utilisateur</label>
          <Input
            value={formData.username}
            onChange={(event) => setFormData({ ...formData, username: event.target.value })}
            placeholder="marie.dupont"
            className="bg-secondary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Mot de passe{mode === 'edit' ? ' (conserve)' : ''}
          </label>
          <Input
            type="password"
            value={formData.password}
            onChange={(event) => setFormData({ ...formData, password: event.target.value })}
            placeholder={mode === 'create' ? 'Mot de passe initial' : 'Mot de passe conserve'}
            disabled={mode === 'edit'}
            className="bg-secondary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Type utilisateur</label>
          <Select
            value={formData.role}
            onValueChange={(value: UserRole) =>
              setFormData({
                ...formData,
                role: value,
                assignedPointId: value === 'COLLECTOR' ? formData.assignedPointId : '',
                assignedVehicleId: value === 'TRANSPORTER' ? formData.assignedVehicleId : '',
                transporterCommissionRate:
                  value === 'TRANSPORTER' ? formData.transporterCommissionRate : '',
              })
            }
          >
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
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Statut</label>
          <Select
            value={formData.status}
            onValueChange={(value: UserStatus) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger className="bg-secondary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(userStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.role === 'COLLECTOR' && (
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Point de collecte</label>
          <Select
            value={formData.assignedPointId}
            onValueChange={(value) => setFormData({ ...formData, assignedPointId: value })}
          >
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
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Vehicule assigne</label>
            <Select
              value={formData.assignedVehicleId}
              onValueChange={(value) => setFormData({ ...formData, assignedVehicleId: value })}
            >
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
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Commission optionnelle (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.transporterCommissionRate}
              onChange={(event) =>
                setFormData({ ...formData, transporterCommissionRate: event.target.value })
              }
              placeholder="Exemple: 12"
              className="bg-secondary"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Laissez vide si ce transporteur n'a pas de commission specifique.
            </p>
          </div>
        </div>
      )}

      {formError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestion d&apos;Equipe</h2>
          <p className="text-muted-foreground">
            Admin entreprise, employes, collecteurs et transporteurs avec gestion de profil et statut
          </p>
        </div>
        <Button className="gap-2" onClick={openAddDialog}>
          <Plus className="h-4 w-4" />
          Creer un utilisateur
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Input
          placeholder="Rechercher par nom, email, telephone ou identifiant..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="max-w-xl bg-secondary"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterRole === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilterRole('ALL')}
            size="sm"
          >
            Tous ({users.length})
          </Button>
          {ALL_ROLES.map((role) => (
            <Button
              key={role}
              variant={filterRole === role ? 'default' : 'outline'}
              onClick={() => setFilterRole(role)}
              size="sm"
            >
              {ROLE_CONFIG[role].label} ({users.filter((user) => user.role === role).length})
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-xs text-muted-foreground">Utilisateurs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
              <UserCheck className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter((user) => user.status === 'ACTIVE').length}
              </p>
              <p className="text-xs text-muted-foreground">Actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
              <UserMinus className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter((user) => user.status === 'SUSPENDED').length}
              </p>
              <p className="text-xs text-muted-foreground">Suspendus</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter((user) => user.role === 'ADMIN').length}
              </p>
              <p className="text-xs text-muted-foreground">Admins entreprise</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/20">
              <Briefcase className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter((user) => user.role === 'EMPLOYEE').length}
              </p>
              <p className="text-xs text-muted-foreground">Employes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Utilisateur</TableHead>
                <TableHead className="text-muted-foreground">Contact</TableHead>
                <TableHead className="text-muted-foreground">Localisation</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Statut</TableHead>
                <TableHead className="text-muted-foreground">Assignation</TableHead>
                <TableHead className="text-muted-foreground">Commission</TableHead>
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
                        <Avatar className="h-10 w-10">
                          {user.profilePhotoUrl && <AvatarImage src={user.profilePhotoUrl} alt={user.name} />}
                          <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                            {user.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{user.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{getLocationLabel(user) || '-'}</span>
                        </div>
                        {user.address && <p className="max-w-[220px] truncate">{user.address}</p>}
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
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-lg px-2 py-1 text-xs font-medium',
                          userStatusStyles[user.status]
                        )}
                      >
                        {userStatusLabels[user.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {assignedResource || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {formatTransporterCommission(user) ?? <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(user)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPhoneDialog(user)}>
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPhotoDialog(user)}>
                          <Camera className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPasswordDialog(user)}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        {user.status !== 'ACTIVE' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success"
                            onClick={() => setUserStatus(user.id, 'ACTIVE')}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-warning"
                            onClick={() => setUserStatus(user.id, 'SUSPENDED')}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
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
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Aucun utilisateur trouve.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          resetDialogs();
        }
      }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Creation d&apos;utilisateur</DialogTitle>
            <DialogDescription>
              Renseignez le profil complet, les acces et le type d&apos;utilisateur.
            </DialogDescription>
          </DialogHeader>
          {renderUserForm('create')}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd} className="gap-2">
              <Save className="h-4 w-4" />
              Creer l&apos;utilisateur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          resetDialogs();
        }
      }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Gestion profil</DialogTitle>
            <DialogDescription>
              Modifiez le profil, la localisation et le type utilisateur.
            </DialogDescription>
          </DialogHeader>
          {renderUserForm('edit')}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditProfile} className="gap-2">
              <Save className="h-4 w-4" />
              Modifier le profil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
        setIsPasswordDialogOpen(open);
        if (!open) {
          resetDialogs();
        }
      }}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Changer le mot de passe</DialogTitle>
            <DialogDescription>
              Definissez un nouveau mot de passe pour {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="mb-2 block text-sm font-medium text-foreground">Nouveau mot de passe</label>
            <Input
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="Nouveau mot de passe"
              className="bg-secondary"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handlePasswordChange} className="gap-2">
              <KeyRound className="h-4 w-4" />
              Changer le mot de passe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPhoneDialogOpen} onOpenChange={(open) => {
        setIsPhoneDialogOpen(open);
        if (!open) {
          resetDialogs();
        }
      }}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Modifier le telephone</DialogTitle>
            <DialogDescription>
              Mettez a jour le numero de contact de {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="mb-2 block text-sm font-medium text-foreground">Telephone</label>
            <Input
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              placeholder="+33 6 00 00 00 00"
              className="bg-secondary"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPhoneDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handlePhoneChange} className="gap-2">
              <Phone className="h-4 w-4" />
              Modifier le telephone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPhotoDialogOpen} onOpenChange={(open) => {
        setIsPhotoDialogOpen(open);
        if (!open) {
          resetDialogs();
        }
      }}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Ajouter une photo</DialogTitle>
            <DialogDescription>
              Importez une photo de profil pour {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 rounded-xl bg-secondary/40 p-4">
              <Avatar className="h-14 w-14">
                {selectedUser?.profilePhotoUrl && (
                  <AvatarImage src={selectedUser.profilePhotoUrl} alt={selectedUser.name} />
                )}
                <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
                  {selectedUser?.avatar}
                </AvatarFallback>
              </Avatar>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                <Camera className="h-4 w-4" />
                Choisir une image
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
            {photoError && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {photoError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPhotoDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open);
        if (!open) {
          resetDialogs();
        }
      }}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Supprimer l&apos;utilisateur</DialogTitle>
            <DialogDescription>
              Etes-vous sur de vouloir supprimer {selectedUser?.name} ? Cette action est irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
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
