'use client';

import { create } from 'zustand';
import {
  PARCELS,
  VEHICLES,
  COLLECTION_POINTS,
  DEMO_USERS,
  TRANSFER_REQUESTS,
  PRICING_RULES,
  type Parcel,
  type Vehicle,
  type CollectionPoint,
  type User,
  type TransferRequest,
  type PricingRule,
  type ParcelStatus,
  type VehicleStatus,
  type UserRole,
} from './mock-data';

interface StoreState {
  // Data
  parcels: Parcel[];
  vehicles: Vehicle[];
  collectionPoints: CollectionPoint[];
  users: User[];
  transferRequests: TransferRequest[];
  pricingRules: PricingRule[];

  // Parcel actions
  updateParcelStatus: (parcelId: string, status: ParcelStatus, actorId: string, actorName: string, location: string, vehicleId?: string) => void;
  assignParcelToVehicle: (parcelId: string, vehicleId: string) => void;
  removeParcelFromVehicle: (parcelId: string) => void;

  // Vehicle actions
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (vehicleId: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (vehicleId: string) => void;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  assignVehicleToTransporter: (vehicleId: string, transporterId: string) => void;

  // User actions
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;

  // Collection Point actions
  addCollectionPoint: (point: Omit<CollectionPoint, 'id'>) => void;
  updateCollectionPoint: (pointId: string, updates: Partial<CollectionPoint>) => void;
  deleteCollectionPoint: (pointId: string) => void;
  updatePointStock: (pointId: string, change: number) => void;

  // Transfer Request actions
  createTransferRequest: (request: Omit<TransferRequest, 'id' | 'createdAt'>) => void;
  updateTransferRequestStatus: (requestId: string, status: 'ACCEPTED' | 'REJECTED') => void;

  // Pricing Rule actions
  addPricingRule: (rule: Omit<PricingRule, 'id'>) => void;
  updatePricingRule: (ruleId: string, updates: Partial<PricingRule>) => void;
  deletePricingRule: (ruleId: string) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useStore = create<StoreState>((set, get) => ({
  // Initial data
  parcels: PARCELS,
  vehicles: VEHICLES,
  collectionPoints: COLLECTION_POINTS,
  users: DEMO_USERS,
  transferRequests: TRANSFER_REQUESTS,
  pricingRules: PRICING_RULES,

  // Parcel actions
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
    }));
  },

  updateVehicleStatus: (vehicleId, status) => {
    set((state) => ({
      vehicles: state.vehicles.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, status } : vehicle
      ),
    }));
  },

  assignVehicleToTransporter: (vehicleId, transporterId) => {
    set((state) => ({
      vehicles: state.vehicles.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, assignedTransporterId: transporterId } : vehicle
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
    }));
  },

  updatePointStock: (pointId, change) => {
    set((state) => ({
      collectionPoints: state.collectionPoints.map((point) =>
        point.id === pointId
          ? { ...point, currentStock: Math.max(0, point.currentStock + change) }
          : point
      ),
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
