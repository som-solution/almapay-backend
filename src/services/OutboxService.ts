
import { PrismaClient, EventStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class OutboxService {

    /**
     * Get all pending events that need processing.
     * Used by the Worker or Ops Dashboard.
     */
    async getPendingEvents(limit: number = 100) {
        return prisma.outboxEvent.findMany({
            where: {
                status: EventStatus.PENDING,
                retryCount: { lt: 5 } // Max Retries
            },
            orderBy: { createdAt: 'asc' }, // FIFO
            take: limit
        });
    }

    /**
     * processEvent
     * Simulates processing sending to provider.
     */
    async processEvent(eventId: string) {
        const event = await prisma.outboxEvent.findUnique({ where: { id: eventId } });
        if (!event) throw new Error("Event not found");

        try {
            console.log(`[Outbox] Processing ${event.type} for ${event.aggregateId}`);

            // Logic to call provider would go here...

            await prisma.outboxEvent.update({
                where: { id: eventId },
                data: { status: EventStatus.COMPLETED, processedAt: new Date() }
            });
            return true;
        } catch (error) {
            await prisma.outboxEvent.update({
                where: { id: eventId },
                data: {
                    retryCount: { increment: 1 },
                    // If max retries, move to FAILED (Dead Letter)
                    status: event.retryCount >= 4 ? EventStatus.FAILED : EventStatus.PENDING
                }
            });
            throw error;
        }
    }

    async getDeadLetters() {
        return prisma.outboxEvent.findMany({
            where: { status: EventStatus.FAILED },
            orderBy: { createdAt: 'desc' }
        });
    }
}
