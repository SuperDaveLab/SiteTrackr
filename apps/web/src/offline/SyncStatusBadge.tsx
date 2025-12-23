import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { useOnlineStatus } from './useOnlineStatus';
import { getSyncStatus, subscribeToSyncStatus } from './syncRunner';
import { Badge, type BadgeVariant } from '../components/common/Badge';
import './SyncStatusBadge.css';

export const SyncStatusBadge = () => {
  const { online } = useOnlineStatus();
  const [status, setStatus] = useState(() => getSyncStatus());
  const outboxItems = useLiveQuery(() => db.outbox.toArray(), [], []);

  const pendingCount = outboxItems?.filter((item) => item.status === 'pending').length ?? 0;
  const failedCount = outboxItems?.filter((item) => item.status === 'failed').length ?? 0;

  useEffect(() => {
    return subscribeToSyncStatus((next) => setStatus(next));
  }, []);

  let variant: 'idle' | 'offline' | 'pending' | 'syncing' | 'failed' = 'idle';
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

  const badgeVariant: BadgeVariant =
    variant === 'failed'
      ? 'danger'
      : variant === 'offline'
      ? 'warning'
      : variant === 'pending'
      ? 'muted'
      : variant === 'syncing'
      ? 'primary'
      : 'success';

  const palette: Record<typeof variant, { background: string; border: string; dot: string; text?: string }> = {
    idle: {
      background: 'rgba(255, 255, 255, 0.16)',
      border: 'rgba(255, 255, 255, 0.3)',
      dot: '#34d399',
      text: 'var(--color-primary-contrast)'
    },
    syncing: {
      background: 'rgba(255, 255, 255, 0.16)',
      border: 'rgba(255, 255, 255, 0.3)',
      dot: '#93c5fd',
      text: 'var(--color-primary-contrast)'
    },
    pending: {
      background: 'rgba(255, 255, 255, 0.16)',
      border: 'rgba(255, 255, 255, 0.3)',
      dot: '#fbbf24',
      text: 'var(--color-primary-contrast)'
    },
    offline: {
      background: 'rgba(255, 255, 255, 0.16)',
      border: 'rgba(255, 255, 255, 0.3)',
      dot: '#fb923c',
      text: 'var(--color-primary-contrast)'
    },
    failed: {
      background: 'rgba(239, 68, 68, 0.25)',
      border: 'rgba(239, 68, 68, 0.45)',
      dot: '#f87171',
      text: 'var(--color-primary-contrast)'
    }
  };

  const paletteEntry = palette[variant];

  return (
    <Badge
      variant={badgeVariant}
      className="sync-status-badge"
      title={online ? 'Offline sync engine status' : 'Browser is offline'}
      style={{
        background: paletteEntry.background,
        border: `1px solid ${paletteEntry.border}`,
        color: paletteEntry.text ?? 'var(--color-primary-contrast)'
      }}
    >
      <span className="sync-status-dot" aria-hidden style={{ background: paletteEntry.dot }} />
      <span>{label}</span>
      {pendingCount > 0 && variant !== 'failed' && <span>({pendingCount})</span>}
      {failedCount > 0 && <span>⚠ {failedCount}</span>}
    </Badge>
  );
};
