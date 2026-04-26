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
  PRICING_RULES,
  type Parcel,
  type Vehicle,
  type CollectionPoint,
  type Country,
  type City,
  type Zone,
  type User,
  type TransferRequest,
  type PricingRule,
  type ParcelStatus,
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
  pricingRules: PricingRule[];

  // Parcel actions
  addParcel: (parcel: CreateParcelInput) => Parcel;
  updateParcelStatus: (parcelId: string, status: ParcelStatus, actorId: string, actorName: string, location: string, vehicleId?: string) => void;
  assignParcelToVehicle: (parcelId: string, vehicleId: string) => void;
  removeParcelFromVehicle: (parcelId: string) => void;

  // Vehicle actions
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (vehicleId: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (vehicleId: string) => void;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  assignVehicleToTransporters: (vehicleId: string, transporterIds: string[]) => void;

  // User actions
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;

  // Collection Point actions
  addCollectionPoint: (point: Omit<CollectionPoint, 'id'>) => void;
  updateCollectionPoint: (pointId: string, updates: Partial<CollectionPoint>) => void;
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
  updateTransferRequestStatus: (requestId: string, status: 'ACCEPTED' | 'REJECTED') => void;

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
      weight: parcel.weight,
      volume: parcel.volume,
      description: parcel.description,
      declaredValue: parcel.declaredValue,
      packageCondition: parcel.packageCondition,
      senderKyc: {
        ...parcel.senderKyc,
        verificationStatus: 'VERIFIED',
        verifiedAt: now,
      },
      status: 'RECEIVED_AT_COLLECTION_POINT',
      originPointId: parcel.originPointId,
      destinationPointId: parcel.destinationPointId,
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
    const newUser: User = { ...user, id: `user-${generateId()}` };
    set((state) => ({ users: [...state.users, newUser] }));
  },

  updateUser: (userId, updates) => {
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, ...updates } : user
      ),
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
        request.id === requestId ? { ...request, status } : request
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
