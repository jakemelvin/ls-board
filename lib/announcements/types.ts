export interface AnnouncementRequest {
  collectionPointId: number;
  transportModeId: number;
  parcelTypeId: number;
  title: string;
  content: string;
  startDate: string;
  endDate: string;
  active?: boolean;
  renewable?: boolean;
}

export interface AnnouncementRenewRequest {
  startDate: string;
  endDate: string;
  active?: boolean;
}

export interface AnnouncementResponse {
  id: number;
  companyId: number;
  companyName: string;
  collectionPointId: number;
  collectionPointName: string;
  transportModeId: number;
  transportModeName: string;
  parcelTypeId: number;
  parcelTypeName: string;
  title: string;
  content: string;
  startDate: string;
  endDate: string;
  active: boolean;
  renewable: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionPointOption {
  id: number;
  name: string;
  reference: string;
}

export interface TransportModeOption {
  id: number;
  name: string;
}

export interface ParcelTypeOption {
  id: number;
  name: string;
}
