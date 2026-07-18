export type ApiRole =
  | 'CLIENT'
  | 'COLLECTOR'
  | 'TRANSPORTER'
  | 'ADMIN_COMPANY'
  | 'EMPLOYEE_COMPANY'
  | 'SUPER_ADMIN';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type PaymentCollectionMode = 'PLATFORM' | 'COLLECTION_POINT';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  userId: number;
  role: ApiRole;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  profileImageUrl?: string;
}

export interface MessageResponse {
  message?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordVerifyRequest {
  email: string;
  code: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
  phone: string;
  idCardNumber?: string;
  commissionPercentage?: number;
  password: string;
  country: number;
  language: string;
  city: string;
  address?: string;
  gender?: Gender;
  role: ApiRole;
}

export interface CreateCompanyRequest {
  name: string;
  email?: string;
  phone: string;
  companyUrl: string;
  address?: string;
  countryId: number;
  city: string;
  paymentCollectionMode?: PaymentCollectionMode;
  adminUser: CreateUserRequest;
}

export interface CountryResponse {
  countryId: number;
  countryName: string;
  countryCode: number;
  isoCode: string;
}

export interface LanguageResponse {
  languageCode?: string;
  languageName?: string;
}

export interface CompanyResponse {
  id: number;
  name: string;
  email?: string;
  phone: string;
  companyUrl: string;
  logoUrl?: string;
  country: CountryResponse;
  city: string;
  paymentCollectionMode: PaymentCollectionMode;
  approved: boolean;
  exploitable: boolean;
  operationalCheckAt?: string;
  adminId: number;
  adminUsername: string;
}

export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
  phone: string;
  idCardNumber?: string;
  commissionPercentage?: number;
  country?: CountryResponse;
  language?: LanguageResponse;
  city?: string;
  address?: string;
  role: ApiRole;
  status: UserStatus;
  profileImageUrl?: string;
  fcmToken?: string;
}

export interface UserSearchResponse {
  id: number;
  firstName?: string;
  lastName?: string;
  username: string;
  phone?: string;
  profileImageUrl?: string;
  countryId?: number;
  countryName?: string;
  countryCode?: number;
  city?: string;
  address?: string;
  role?: ApiRole;
  status?: UserStatus;
}

export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  city?: string;
  address?: string;
  gender?: Gender;
  language?: string;
  idCardNumber?: string;
}

export interface AuthUser {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  idCardNumber?: string;
  language?: string;
  role?: ApiRole;
  status?: UserStatus;
  profileImageUrl?: string;
}

export interface AuthSession {
  token: string;
  userId: number;
  role: ApiRole;
  companyId?: number;
  user?: AuthUser;
}
