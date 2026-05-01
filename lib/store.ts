'use client';

import { create } from 'zustand';
import {
  CITIES,
  COUNTRIES,
  ZONES,
  PARCELS,
  VEHICLES,
  COLLECTION_POINTS,
  DEMO_USERS,
  TRANSFER_REQUESTS,
  PARCEL_GROUPS,
  PARCEL_NOTES,
  PRICING_RULES,
  type Parcel,
  type ParcelGroup,
  type ParcelNote,
  type Vehicle,
  type CollectionPoint,
  type Country,
  type City,
  type Zone,
  type User,
  type TransferRequest,
  type PricingRule,
  type ParcelStatus,
  type ParcelPickupReadiness,
  type VehicleStatus,
  type UserRole,
  type CreateParcelInput,
} from './mock-data';

interface StoreState {
  // Data
  parcels: Parcel[];
  vehicles: Vehicle[];
  collectionPoints: CollectionPoint[];
  countries: Country[];
  cities: City[];
  zones: Zone[];
  users: User[];
  transferRequests: TransferRequest[];
  parcelGroups: ParcelGroup[];
  parcelNotes: ParcelNote[];
  pricingRules: PricingRule[];

  // Parcel actions
  addParcel: (parcel: CreateParcelInput) => Parcel;
  updateParcelStatus: (parcelId: string, status: ParcelStatus, actorId: string, actorName: string, location: string, vehicleId?: string) => void;
  assignParcelToVehicle: (parcelId: string, vehicleId: string) => void;
  removeParcelFromVehicle: (parcelId: string) => void;
  createParcelGroup: (parcelIds: string[], collectionPointId: string, actorId: string, actorName: string) => ParcelGroup | null;
  createTourParcelGroup: (parcelIds: string[], vehicleId: string, actorId: string, actorName: string) => ParcelGroup | null;
  deliverParcelGroup: (groupId: string, actorId: string, actorName: string, location: string) => number;
  dissolveParcelGroup: (groupId: string) => void;
  updateParcelPickupReadiness: (parcelIds: string[], readiness: ParcelPickupReadiness) => void;
  addParcelNote: (note: Omit<ParcelNote, 'id' | 'createdAt'>) => void;

  // Vehicle actions
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (vehicleId: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (vehicleId: string) => void;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  assignVehicleToTransporters: (vehicleId: string, transporterIds: string[]) => void;

  // User actions
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  updateUserPassword: (userId: string, password: string) => void;
  setUserStatus: (userId: string, status: User['status']) => void;
  deleteUser: (userId: string) => void;

  // Collection Point actions
  addCollectionPoint: (point: Omit<CollectionPoint, 'id'>) => void;
  updateCollectionPoint: (pointId: string, updates: Partial<CollectionPoint>) => void;
  setCollectionPointOpenStatus: (pointId: string, isOpen: boolean, closedReason?: string) => void;
  deleteCollectionPoint: (pointId: string) => void;

  // Territory actions
  addCountry: (country: Omit<Country, 'id'>) => void;
  updateCountry: (countryId: string, updates: Partial<Country>) => void;
  deleteCountry: (countryId: string) => void;
  addCity: (city: Omit<City, 'id'>) => void;
  updateCity: (cityId: string, updates: Partial<City>) => void;
  deleteCity: (cityId: string) => void;
  addZone: (zone: Omit<Zone, 'id'>) => void;
  updateZone: (zoneId: string, updates: Partial<Zone>) => void;
  deleteZone: (zoneId: string) => void;

  // Transfer Request actions
  createTransferRequest: (request: Omit<TransferRequest, 'id' | 'createdAt'>) => void;
  updateTransferRequestStatus: (requestId: string, status: 'ACCEPTED' | 'REJECTED' | 'COMPLETED') => void;
  completeTransferRequestPickup: (requestId: string, parcelIds: string[], actorId: string, actorName: string) => void;

  // Pricing Rule actions
  addPricingRule: (rule: Omit<PricingRule, 'id'>) => void;
  updatePricingRule: (ruleId: string, updates: Partial<PricingRule>) => void;
  deletePricingRule: (ruleId: string) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const createTrackingNumber = () => {
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `EXP-${timestamp}-${suffix}`;
};

const buildDisplayName = (firstName?: string, lastName?: string, fallback?: string) => {
  const fullName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ').trim();
  return fullName || fallback || '';
};

export const useStore = create<StoreState>((set, get) => ({
  // Initial data
  parcels: PARCELS,
  vehicles: VEHICLES,
  collectionPoints: COLLECTION_POINTS,
  countries: COUNTRIES,
  cities: CITIES,
  zones: ZONES,
  users: DEMO_USERS,
  transferRequests: TRANSFER_REQUESTS,
  parcelGroups: PARCEL_GROUPS,
  parcelNotes: PARCEL_NOTES,
  pricingRules: PRICING_RULES,

  // Parcel actions
  addParcel: (parcel) => {
    const now = new Date();
    const originCollectionPointName =
      get().collectionPoints.find((point) => point.id === parcel.originPointId)?.name ??
      'Point de collecte';
    const newParcel: Parcel = {
      id: `parcel-${generateId()}`,
      trackingNumber: createTrackingNumber(),
      senderName: parcel.senderName,
      senderPhone: parcel.senderPhone,
      recipientName: parcel.recipientName,
      recipientPhone: parcel.recipientPhone,
      recipientFullAddress: parcel.recipientFullAddress,
      weight: parcel.weight,
      volume: parcel.volume,
      description: parcel.description,
      shipmentType: parcel.shipmentType,
      pricingRuleId: parcel.pricingRuleId,
      estimatedDistanceKm: parcel.estimatedDistanceKm,
      estimatedPrice: parcel.estimatedPrice,
      packageCondition: parcel.packageCondition,
      senderKyc: {
        ...parcel.senderKyc,
        verificationStatus: 'VERIFIED',
        verifiedAt: now,
      },
      status: 'RECEIVED_AT_COLLECTION_POINT',
      originPointId: parcel.originPointId,
      destinationCountryId: parcel.destinationCountryId,
      destinationCityId: parcel.destinationCityId,
      destinationZoneId: parcel.destinationZoneId,
      destinationPointId: parcel.destinationPointId,
      pickupReadiness: 'PENDING',
      images: parcel.images ?? [],
      collectedByUserId: parcel.createdBy.id,
      collectedAt: now,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          status: 'RECEIVED_AT_COLLECTION_POINT',
          timestamp: now,
          actorId: parcel.createdBy.id,
          actorName: parcel.createdBy.name,
          location: originCollectionPointName,
        },
      ],
    };

    set((state) => ({ parcels: [newParcel, ...state.parcels] }));

    return newParcel;
  },

  updateParcelStatus: (parcelId, status, actorId, actorName, location, vehicleId) => {
    set((state) => ({
      parcels: state.parcels.map((parcel) =>
        parcel.id === parcelId
          ? {
              ...parcel,
              status,
              updatedAt: new Date(),
              currentVehicleId: vehicleId || parcel.currentVehicleId,
              history: [
                ...parcel.history,
                {
                  status,
                  timestamp: new Date(),
                  actorId,
                  actorName,
                  location,
                  vehicleId,
                },
              ],
            }
          : parcel
      ),
    }));
  },

  assignParcelToVehicle: (parcelId, vehicleId) => {
    set((state) => ({
      parcels: state.parcels.map((parcel) =>
        parcel.id === parcelId ? { ...parcel, currentVehicleId: vehicleId } : parcel
      ),
    }));
  },

  removeParcelFromVehicle: (parcelId) => {
    set((state) => ({
      parcels: state.parcels.map((parcel) =>
        parcel.id === parcelId ? { ...parcel, currentVehicleId: undefined } : parcel
      ),
    }));
  },

  createParcelGroup: (parcelIds, collectionPointId, actorId, actorName) => {
    const uniqueParcelIds = Array.from(new Set(parcelIds));
    const eligibleParcels = get().parcels.filter(
      (parcel) =>
        uniqueParcelIds.includes(parcel.id) &&
        parcel.status === 'RECEIVED_AT_COLLECTION_POINT' &&
        !parcel.groupId &&
        parcel.originPointId === collectionPointId
    );

    if (eligibleParcels.length < 2) {
      return null;
    }

    const reference = `LOT-${new Date().toISOString().replace(/\D/g, '').slice(0, 12)}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;
    const newGroup: ParcelGroup = {
      id: `group-${generateId()}`,
      reference,
      scope: 'COLLECTION_POINT',
      collectionPointId,
      parcelIds: eligibleParcels.map((parcel) => parcel.id),
      createdByUserId: actorId,
      createdByName: actorName,
      createdAt: new Date(),
    };

    set((state) => ({
      parcelGroups: [newGroup, ...state.parcelGroups],
      parcels: state.parcels.map((parcel) =>
        eligibleParcels.some((item) => item.id === parcel.id)
          ? { ...parcel, groupId: newGroup.id, updatedAt: new Date() }
          : parcel
      ),
    }));

    return newGroup;
  },

  createTourParcelGroup: (parcelIds, vehicleId, actorId, actorName) => {
    const uniqueParcelIds = Array.from(new Set(parcelIds));
    const eligibleParcels = get().parcels.filter(
      (parcel) =>
        uniqueParcelIds.includes(parcel.id) &&
        parcel.status === 'IN_TRANSIT' &&
        parcel.currentVehicleId === vehicleId &&
        !parcel.groupId
    );

    if (eligibleParcels.length < 2) {
      return null;
    }

    const now = new Date();
    const reference = `LOT-${now.toISOString().replace(/\D/g, '').slice(0, 12)}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;
    const originPointId = eligibleParcels[0]?.originPointId;
    const newGroup: ParcelGroup = {
      id: `group-${generateId()}`,
      reference,
      scope: 'TRANSPORTER_TOUR',
      collectionPointId: originPointId,
      vehicleId,
      parcelIds: eligibleParcels.map((parcel) => parcel.id),
      createdByUserId: actorId,
      createdByName: actorName,
      createdAt: now,
    };

    set((state) => ({
      parcelGroups: [newGroup, ...state.parcelGroups],
      parcels: state.parcels.map((parcel) =>
        eligibleParcels.some((item) => item.id === parcel.id)
          ? { ...parcel, groupId: newGroup.id, updatedAt: now }
          : parcel
      ),
    }));

    return newGroup;
  },

  deliverParcelGroup: (groupId, actorId, actorName, location) => {
    const now = new Date();
    const group = get().parcelGroups.find((item) => item.id === groupId);

    if (!group) {
      return 0;
    }

    const deliveredParcelIds = get().parcels
      .filter((parcel) => group.parcelIds.includes(parcel.id) && parcel.status === 'IN_TRANSIT')
      .map((parcel) => parcel.id);

    if (deliveredParcelIds.length === 0) {
      return 0;
    }

    set((state) => ({
      parcels: state.parcels.map((parcel) =>
        deliveredParcelIds.includes(parcel.id)
          ? {
              ...parcel,
              status: 'ARRIVED_AT_DESTINATION',
              updatedAt: now,
              currentVehicleId: undefined,
              history: [
                ...parcel.history,
                {
                  status: 'ARRIVED_AT_DESTINATION',
                  timestamp: now,
                  actorId,
                  actorName,
                  location,
                  vehicleId: parcel.currentVehicleId,
                },
              ],
            }
          : parcel
      ),
    }));

    return deliveredParcelIds.length;
  },

  dissolveParcelGroup: (groupId) => {
    set((state) => ({
      parcelGroups: state.parcelGroups.filter((group) => group.id !== groupId),
      parcels: state.parcels.map((parcel) =>
        parcel.groupId === groupId ? { ...parcel, groupId: undefined, updatedAt: new Date() } : parcel
      ),
    }));
  },

  updateParcelPickupReadiness: (parcelIds, readiness) => {
    const uniqueParcelIds = Array.from(new Set(parcelIds));

    set((state) => ({
      parcels: state.parcels.map((parcel) =>
        uniqueParcelIds.includes(parcel.id)
          ? { ...parcel, pickupReadiness: readiness, updatedAt: new Date() }
          : parcel
      ),
    }));
  },

  addParcelNote: (note) => {
    const newNote: ParcelNote = {
      ...note,
      id: `note-${generateId()}`,
      createdAt: new Date(),
    };

    set((state) => ({
      parcelNotes: [newNote, ...state.parcelNotes],
    }));
  },

  // Vehicle actions
  addVehicle: (vehicle) => {
    const newVehicle: Vehicle = { ...vehicle, id: `vehicle-${generateId()}` };
    set((state) => ({ vehicles: [...state.vehicles, newVehicle] }));
  },

  updateVehicle: (vehicleId, updates) => {
    set((state) => ({
      vehicles: state.vehicles.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, ...updates } : vehicle
      ),
    }));
  },

  deleteVehicle: (vehicleId) => {
    set((state) => ({
      vehicles: state.vehicles.filter((vehicle) => vehicle.id !== vehicleId),
      users: state.users.map((user) =>
        user.assignedVehicleId === vehicleId ? { ...user, assignedVehicleId: undefined } : user
      ),
    }));
  },

  updateVehicleStatus: (vehicleId, status) => {
    set((state) => ({
      vehicles: state.vehicles.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, status } : vehicle
      ),
    }));
  },

  assignVehicleToTransporters: (vehicleId, transporterIds) => {
    set((state) => ({
      users: state.users.map((user) => {
        if (user.role !== 'TRANSPORTER') {
          return user;
        }

        const shouldBeAssigned = transporterIds.includes(user.id);
        const isAssignedToVehicle = user.assignedVehicleId === vehicleId;

        if (shouldBeAssigned) {
          return { ...user, assignedVehicleId: vehicleId };
        }

        if (isAssignedToVehicle) {
          return { ...user, assignedVehicleId: undefined };
        }

        return user;
      }),
      vehicles: state.vehicles.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle } : vehicle
      ),
    }));
  },

  // User actions
  addUser: (user) => {
    const name = buildDisplayName(user.firstName, user.lastName, user.name);
    const newUser: User = { ...user, id: `user-${generateId()}`, name };
    set((state) => ({ users: [...state.users, newUser] }));
  },

  updateUser: (userId, updates) => {
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId
          ? {
              ...user,
              ...updates,
              name: buildDisplayName(
                updates.firstName ?? user.firstName,
                updates.lastName ?? user.lastName,
                updates.name ?? user.name
              ),
            }
          : user
      ),
    }));
  },

  updateUserPassword: (userId, password) => {
    set((state) => ({
      users: state.users.map((user) => (user.id === userId ? { ...user, password } : user)),
    }));
  },

  setUserStatus: (userId, status) => {
    set((state) => ({
      users: state.users.map((user) => (user.id === userId ? { ...user, status } : user)),
    }));
  },

  deleteUser: (userId) => {
    set((state) => ({
      users: state.users.filter((user) => user.id !== userId),
    }));
  },

  // Collection Point actions
  addCollectionPoint: (point) => {
    const newPoint: CollectionPoint = { ...point, id: `point-${generateId()}` };
    set((state) => ({ collectionPoints: [...state.collectionPoints, newPoint] }));
  },

  updateCollectionPoint: (pointId, updates) => {
    set((state) => ({
      collectionPoints: state.collectionPoints.map((point) =>
        point.id === pointId ? { ...point, ...updates } : point
      ),
    }));
  },

  setCollectionPointOpenStatus: (pointId, isOpen, closedReason) => {
    set((state) => ({
      collectionPoints: state.collectionPoints.map((point) =>
        point.id === pointId
          ? {
              ...point,
              isOpen,
              closedReason: isOpen ? undefined : closedReason?.trim() || 'Indisponible temporairement',
            }
          : point
      ),
    }));
  },

  deleteCollectionPoint: (pointId) => {
    set((state) => ({
      collectionPoints: state.collectionPoints.filter((point) => point.id !== pointId),
      users: state.users.map((user) =>
        user.assignedPointId === pointId ? { ...user, assignedPointId: undefined } : user
      ),
    }));
  },

  addCountry: (country) => {
    const newCountry: Country = { ...country, id: `country-${generateId()}` };
    set((state) => ({ countries: [...state.countries, newCountry] }));
  },

  updateCountry: (countryId, updates) => {
    set((state) => ({
      countries: state.countries.map((country) =>
        country.id === countryId ? { ...country, ...updates } : country
      ),
    }));
  },

  deleteCountry: (countryId) => {
    set((state) => ({
      countries: state.countries.filter((country) => country.id !== countryId),
    }));
  },

  addCity: (city) => {
    const newCity: City = { ...city, id: `city-${generateId()}` };
    set((state) => ({ cities: [...state.cities, newCity] }));
  },

  updateCity: (cityId, updates) => {
    set((state) => ({
      cities: state.cities.map((city) => (city.id === cityId ? { ...city, ...updates } : city)),
    }));
  },

  deleteCity: (cityId) => {
    set((state) => ({
      cities: state.cities.filter((city) => city.id !== cityId),
    }));
  },

  addZone: (zone) => {
    const newZone: Zone = { ...zone, id: `zone-${generateId()}` };
    set((state) => ({ zones: [...state.zones, newZone] }));
  },

  updateZone: (zoneId, updates) => {
    set((state) => ({
      zones: state.zones.map((zone) => (zone.id === zoneId ? { ...zone, ...updates } : zone)),
    }));
  },

  deleteZone: (zoneId) => {
    set((state) => ({
      zones: state.zones.filter((zone) => zone.id !== zoneId),
    }));
  },

  // Transfer Request actions
  createTransferRequest: (request) => {
    const newRequest: TransferRequest = {
      ...request,
      id: `transfer-${generateId()}`,
      createdAt: new Date(),
    };
    set((state) => ({ transferRequests: [...state.transferRequests, newRequest] }));
  },

  updateTransferRequestStatus: (requestId, status) => {
    set((state) => ({
      transferRequests: state.transferRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status,
              respondedAt: status === 'ACCEPTED' || status === 'REJECTED' ? new Date() : request.respondedAt,
              completedAt: status === 'COMPLETED' ? new Date() : request.completedAt,
            }
          : request
      ),
    }));
  },

  completeTransferRequestPickup: (requestId, parcelIds, actorId, actorName) => {
    const request = get().transferRequests.find((item) => item.id === requestId);
    const transporter = get().users.find((user) => user.id === actorId);
    const transporterVehicleId = transporter?.assignedVehicleId;

    if (!request || request.status !== 'ACCEPTED') {
      return;
    }

    const pickedParcelIds = request.parcelIds.filter((parcelId) => parcelIds.includes(parcelId));

    set((state) => ({
      parcels: state.parcels.map((parcel) =>
        pickedParcelIds.includes(parcel.id)
          ? {
              ...parcel,
              status: 'IN_TRANSIT',
              updatedAt: new Date(),
              currentVehicleId: transporterVehicleId ?? parcel.currentVehicleId,
              history: [
                ...parcel.history,
                {
                  status: 'IN_TRANSIT',
                  timestamp: new Date(),
                  actorId,
                  actorName,
                  location: 'Colis charge par le transporteur',
                  vehicleId: transporterVehicleId,
                },
              ],
            }
          : parcel
      ),
      transferRequests: state.transferRequests.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: 'COMPLETED',
              pickedParcelIds,
              completedAt: new Date(),
            }
          : item
      ),
    }));
  },

  // Pricing Rule actions
  addPricingRule: (rule) => {
    const newRule: PricingRule = { ...rule, id: `price-${generateId()}` };
    set((state) => ({ pricingRules: [...state.pricingRules, newRule] }));
  },

  updatePricingRule: (ruleId, updates) => {
    set((state) => ({
      pricingRules: state.pricingRules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      ),
    }));
  },

  deletePricingRule: (ruleId) => {
    set((state) => ({
      pricingRules: state.pricingRules.filter((rule) => rule.id !== ruleId),
    }));
  },
}));
