import {
  EcoLevel,
  Gender,
  NotificationType,
  RequestStatus,
  RideStatus,
  UserRole,
  VerificationStatus,
} from './enums';

export interface UserPublicProfile {
  id: string;
  fullName: string;
  profilePhoto?: string;
  ecoLevel: EcoLevel;
  averageRating: number;
  totalRides: number;
  companyName?: string;
}

export interface UserProfile extends UserPublicProfile {
  phone: string;
  email: string;
  gender?: Gender;
  role: UserRole;
  verificationStatus: VerificationStatus;
  ecoPoints: number;
  employeeId?: string;
}

export interface RideDTO {
  id: string;
  rideGiver: UserPublicProfile;
  vehicle: VehicleDTO;
  originName: string;
  originLat: number;
  originLng: number;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  routePolyline?: GeoJSON.LineString;
  estimatedDistanceKm?: number;
  estimatedDurationMin?: number;
  departureDate: string;
  departureTime: string;
  estimatedArrivalTime?: string;
  totalSeats: number;
  availableSeats: number;
  status: RideStatus;
  notes?: string;
  createdAt: string;
}

export interface VehicleDTO {
  id: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  plateNumber: string;
  totalSeats: number;
  rcVerified: boolean;
}

export interface RideRequestDTO {
  id: string;
  ride: RideDTO;
  seeker: UserPublicProfile;
  pickupName?: string;
  dropName?: string;
  status: RequestStatus;
  holdExpiresAt?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface GpsPayload {
  rideId: string;
  lat: number;
  lng: number;
  speed?: number;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
}
