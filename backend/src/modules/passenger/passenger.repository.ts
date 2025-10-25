import { and, asc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { database } from '../../infra/database';
import { passengerSavedLocations } from '../../infra/database/schema';
import type {
  CreateSavedLocationInput,
  NewPassengerSavedLocation,
  PassengerSavedLocation,
} from './passenger.types';

const mapRecordToSavedLocation = (
  record: typeof passengerSavedLocations.$inferSelect,
): PassengerSavedLocation => ({
  id: record.id,
  passengerId: record.passengerId,
  label: record.label,
  address: record.address,
  location: (record.location ?? {}) as PassengerSavedLocation['location'],
  isDefault: Boolean(record.isDefault),
  createdAt: record.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: record.updatedAt?.toISOString() ?? new Date().toISOString(),
});

export const passengerRepository = {
  async listSavedLocations(passengerId: string): Promise<PassengerSavedLocation[]> {
    const rows = await database.db
      .select()
      .from(passengerSavedLocations)
      .where(eq(passengerSavedLocations.passengerId, passengerId))
      .orderBy(asc(passengerSavedLocations.createdAt));

    return rows.map(mapRecordToSavedLocation);
  },

  async createSavedLocation(
    passengerId: string,
    input: CreateSavedLocationInput,
  ): Promise<PassengerSavedLocation> {
    const newRecord: NewPassengerSavedLocation = {
      id: randomUUID(),
      passengerId,
      label: input.label,
      address: input.address,
      location: input.location,
      isDefault: Boolean(input.isDefault),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [inserted] = await database.db
      .insert(passengerSavedLocations)
      .values(newRecord)
      .returning();

    return mapRecordToSavedLocation(inserted);
  },

  async deleteSavedLocation(passengerId: string, id: string): Promise<boolean> {
    const { rowCount } = await database.db
      .delete(passengerSavedLocations)
      .where(
        and(
          eq(passengerSavedLocations.id, id),
          eq(passengerSavedLocations.passengerId, passengerId),
        ),
      );

    return rowCount > 0;
  },

  async clearDefaultSavedLocations(passengerId: string): Promise<void> {
    await database.db
      .update(passengerSavedLocations)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(passengerSavedLocations.passengerId, passengerId));
  },
};
