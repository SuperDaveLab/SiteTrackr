import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { useOnlineStatus } from './useOnlineStatus';
import { getSyncStatus, subscribeToSyncStatus } from './syncRunner';

const badgeStyles: Record<string, { background: string; color: string }> = {
  offline: { background: '#fef3c7', color: '#b45309' },
  syncing: { background: '#dbeafe', color: '#1d4ed8' },
  pending: { background: '#fffbeb', color: '#92400e' },
  failed: { background: '#fee2e2', color: '#b91c1c' },
  idle: { background: '#dcfce7', color: '#15803d' }
};

export const SyncStatusBadge = () => {
  const { online } = useOnlineStatus();
  const [status, setStatus] = useState(() => getSyncStatus());
  const outboxItems = useLiveQuery(() => db.outbox.toArray(), [], []);

  const pendingCount = outboxItems?.filter((item) => item.status === 'pending').length ?? 0;
  const failedCount = outboxItems?.filter((item) => item.status === 'failed').length ?? 0;

  useEffect(() => {
    return subscribeToSyncStatus((next) => setStatus(next));
  }, []);

  let variant: keyof typeof badgeStyles = 'idle';
  let label = 'Up to date';

  if (!online) {
    variant = 'offline';
    label = 'Offline';
  } else if (failedCount > 0) {
    variant = 'failed';
    label = 'Sync failed';
  } else if (status === 'syncing') {
    variant = 'syncing';
    label = 'Syncing…';
  } else if (pendingCount > 0) {
    variant = 'pending';
    label = 'Pending sync';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.65rem',
        borderRadius: '999px',
        fontSize: '0.8rem',
        fontWeight: 600,
        transition: 'background 0.2s ease, color 0.2s ease',
        background: badgeStyles[variant].background,
        color: badgeStyles[variant].color
      }}
      title={online ? 'Offline sync engine status' : 'Browser is offline'}
    >
      <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '999px', background: badgeStyles[variant].color }} />
      <span>{label}</span>
      {pendingCount > 0 && variant !== 'failed' && (
        <span style={{ fontWeight: 500 }}>({pendingCount})</span>
      )}
      {failedCount > 0 && (
        <span style={{ fontWeight: 500 }}>⚠ {failedCount}</span>
      )}
    </span>
  );
};
