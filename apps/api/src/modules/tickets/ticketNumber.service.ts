import type { FastifyInstance } from 'fastify';

/**
 * Generates the next globally unique ticket number in a transaction-safe manner.
 * Format: ST + zero-padded 5-digit number (e.g., ST00001, ST00002, ...)
 * 
 * @param fastify - The Fastify instance with Prisma plugin
 * @returns A promise that resolves to the formatted ticket number
 */
export async function generateNextTicketNumber(
  fastify: FastifyInstance
): Promise<string> {
  // Use a transaction to atomically increment the counter and get the next value
  const counter = await fastify.prisma.$transaction(async (tx) => {
    // Upsert the global counter (create if missing, increment if exists)
    const updatedCounter = await (tx as any).globalCounter.upsert({
      where: { id: 'global' },
      create: {
        id: 'global',
        ticketNext: 2, // Next ticket will be 2 (we're returning 1)
      },
      update: {
        ticketNext: {
          increment: 1,
        },
      },
      select: {
        ticketNext: true,
      },
    });

    return updatedCounter;
  });

  // The ticketNext value after update is the NEXT number, so we need to subtract 1
  // to get the current number we're using
  const currentNumber = counter.ticketNext - 1;
  
  // Format as ST + zero-padded 5-digit number
  return `ST${currentNumber.toString().padStart(5, '0')}`;
}
