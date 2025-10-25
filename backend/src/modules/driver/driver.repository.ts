import { and, asc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { database } from '../../infra/database';
import {
  driverDocuments,
  vehicles,
} from '../../infra/database/schema';
import type {
  CreateDriverDocumentInput,
  DriverDocument,
  DriverDocumentRecord,
  DriverVehicleRecord,
} from './driver.types';

const mapDocument = (record: DriverDocumentRecord): DriverDocument => ({
  id: record.id,
  driverId: record.driverId,
  documentType: record.documentType,
  status: record.status,
  metadata: record.metadata ?? null,
  submittedAt: record.submittedAt?.toISOString() ?? new Date().toISOString(),
  verifiedAt: record.verifiedAt ? record.verifiedAt.toISOString() : null,
  rejectionReason: record.rejectionReason ?? null,
});

export const driverRepository = {
  async listDocuments(driverId: string): Promise<DriverDocument[]> {
    const rows = await database.db
      .select()
      .from(driverDocuments)
      .where(eq(driverDocuments.driverId, driverId))
      .orderBy(
        asc(driverDocuments.status),
        asc(driverDocuments.submittedAt),
      );

    return rows.map(mapDocument);
  },

  async createDocument(
    driverId: string,
    input: CreateDriverDocumentInput,
  ): Promise<DriverDocument> {
    const now = new Date();
    const [inserted] = await database.db
      .insert(driverDocuments)
      .values({
        id: randomUUID(),
        driverId,
        documentType: input.documentType,
        status: 'pending',
        metadata: input.metadata ?? null,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return mapDocument(inserted);
  },

  async listVehicles(driverId: string): Promise<DriverVehicleRecord[]> {
    return database.db
      .select()
      .from(vehicles)
      .where(eq(vehicles.driverId, driverId))
      .orderBy(asc(vehicles.createdAt));
  },

  async upsertVehicle(
    driverId: string,
    vehicleInput: Partial<DriverVehicleRecord>,
  ): Promise<void> {
    if (!vehicleInput.registrationNumber) {
      return;
    }

    const existing = await database.db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.driverId, driverId),
          eq(vehicles.registrationNumber, vehicleInput.registrationNumber),
        ),
      )
      .limit(1);

    const now = new Date();
    if (existing.length > 0) {
      await database.db
        .update(vehicles)
        .set({
          manufacturer: vehicleInput.manufacturer ?? existing[0].manufacturer,
          model: vehicleInput.model ?? existing[0].model,
          capacity: vehicleInput.capacity ?? existing[0].capacity,
          color: vehicleInput.color ?? existing[0].color,
          status: vehicleInput.status ?? existing[0].status,
          metadata: vehicleInput.metadata ?? existing[0].metadata,
          updatedAt: now,
        })
        .where(eq(vehicles.id, existing[0].id));
      return;
    }

    await database.db.insert(vehicles).values({
      id: randomUUID(),
      driverId,
      manufacturer: vehicleInput.manufacturer ?? 'Unknown',
      model: vehicleInput.model ?? 'Unknown',
      registrationNumber: vehicleInput.registrationNumber,
      capacity: vehicleInput.capacity ?? 4,
      color: vehicleInput.color ?? null,
      status: vehicleInput.status ?? 'pending',
      metadata: vehicleInput.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    });
  },
};
