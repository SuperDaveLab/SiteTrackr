import { db } from './db';
import type { OutboxEntity, OutboxItem, OutboxOp } from './outboxTypes';

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.round(Math.random() * 10_000)}`;
};

export const enqueueOutbox = async (item: {
  entity: OutboxEntity;
  entityId: string;
  op: OutboxOp;
  payload: OutboxItem['payload'];
  baseUpdatedAt?: string;
}): Promise<OutboxItem> => {
  const record: OutboxItem = {
    id: generateId(),
    createdAt: Date.now(),
    status: 'pending',
    error: undefined,
    ...item
  };

  await db.outbox.put(record);
  return record;
};

export const listPendingOutbox = async (): Promise<OutboxItem[]> => {
  return db.outbox.where('status').anyOf(['pending', 'sending']).sortBy('createdAt');
};

export const markSending = async (id: string): Promise<void> => {
  await db.outbox.update(id, { status: 'sending', error: undefined });
};

export const listPendingByEntity = async (entity: OutboxEntity): Promise<OutboxItem[]> => {
  return db.outbox
    .where('entity')
    .equals(entity)
    .and((item) => item.status === 'pending' || item.status === 'sending')
    .sortBy('createdAt');
};

export const markFailed = async (id: string, error: string): Promise<void> => {
  await db.outbox.update(id, { status: 'failed', error });
};

export const removeOutbox = async (id: string): Promise<void> => {
  await db.outbox.delete(id);
};

export const resetOutboxItem = async (id: string): Promise<void> => {
  await db.outbox.update(id, { status: 'pending', error: undefined, createdAt: Date.now() });
};

export const clearOutbox = async (): Promise<void> => {
  await db.outbox.clear();
};

export const countPendingOutbox = async (): Promise<number> => {
  return db.outbox.where('status').equals('pending').count();
};

export type { OutboxEntity, OutboxItem, OutboxOp } from './outboxTypes';
