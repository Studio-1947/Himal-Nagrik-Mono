import type { driverDocuments, vehicles } from '../../infra/database/schema';
import type { DriverProfile } from '../auth/auth.types';
import type {
  DriverProfileUpdateInput,
  DriverRegisterInput,
} from '../auth/auth.validation';

export type DriverProfileResponse = DriverProfile & {
  documents: DriverDocument[];
  availability: DriverAvailabilityState;
};

export type DriverDocument = {
  id: string;
  driverId: string;
  documentType: string;
  status: DriverDocumentStatus;
  metadata: Record<string, unknown> | null;
  submittedAt: string;
  verifiedAt: string | null;
  rejectionReason: string | null;
};

export type DriverDocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type DriverAvailabilityState = DriverProfile['availability'] & {
  isActive: boolean;
};

export type CreateDriverDocumentInput = {
  documentType: string;
  metadata?: Record<string, unknown>;
};

export type DriverOnboardingPayload = DriverRegisterInput;

export type DriverProfileUpdate = DriverProfileUpdateInput;

export type DriverVehicleRecord = typeof vehicles.$inferSelect;

export type DriverDocumentRecord = typeof driverDocuments.$inferSelect;
