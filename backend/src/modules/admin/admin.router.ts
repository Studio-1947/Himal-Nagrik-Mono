import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { database } from '../../infra/database';
import { appUsers, rides } from '../../infra/database/schema';
import { authService, ForbiddenError, UnauthorizedError } from '../auth/auth.service';

export const adminRouter = Router();

// Middleware to ensure user is admin
adminRouter.use(async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return next(new UnauthorizedError('Missing token'));
    }

    try {
        const { user } = await authService.authenticate(token);
        if (user.role !== 'admin') {
            return next(new ForbiddenError('Admin access required'));
        }
        (req as any).user = user;
        next();
    } catch (error) {
        next(error);
    }
});

// List all users
adminRouter.get('/users', async (req, res, next) => {
    try {
        const users = await database.db
            .select({
                id: appUsers.id,
                name: appUsers.name,
                email: appUsers.email,
                role: appUsers.role,
                createdAt: appUsers.createdAt,
            })
            .from(appUsers)
            .orderBy(desc(appUsers.createdAt));

        res.json(users);
    } catch (error) {
        next(error);
    }
});

// List all rides
adminRouter.get('/rides', async (req, res, next) => {
    try {
        const allRides = await database.db
            .select({
                id: rides.id,
                status: rides.status,
                passengerId: rides.passengerId,
                driverId: rides.driverId,
                pickupLocation: rides.pickupLocation,
                dropoffLocation: rides.dropoffLocation,
                createdAt: rides.createdAt,
            })
            .from(rides)
            .orderBy(desc(rides.createdAt));

        res.json(allRides);
    } catch (error) {
        next(error);
    }
});

// Cancel a ride (Emergency)
adminRouter.post('/rides/:id/cancel', async (req, res, next) => {
    try {
        const { id } = req.params;

        await database.db
            .update(rides)
            .set({
                status: 'cancelled_system',
                cancelledAt: new Date(),
                cancellationReason: 'Admin Intervention',
                updatedAt: new Date()
            })
            .where(eq(rides.id, id));

        res.json({ success: true, message: 'Ride cancelled by admin' });
    } catch (error) {
        next(error);
    }
});
