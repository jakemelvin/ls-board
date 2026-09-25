export type SupportContactType =
  | 'EMAIL'
  | 'PHONE'
  | 'WHATSAPP'
  | 'LIVE_CHAT'
  | 'WEBSITE'
  | 'FAQ'
  | 'OTHER';

export interface SupportContactResponse {
  id: number;
  type: SupportContactType;
  title: string;
  description?: string;
  value: string;
  actionUri?: string;
  active?: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupportContactRequest {
  type: SupportContactType;
  title: string;
  description?: string;
  value: string;
  actionUri?: string;
  displayOrder?: number;
  active?: boolean;
}
