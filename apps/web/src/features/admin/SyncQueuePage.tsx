import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../offline/db';
import { clearOutbox, removeOutbox, resetOutboxItem } from '../../offline/outbox';
import { runSyncOnce } from '../../offline/syncRunner';
import { Button } from '../../components/common/Button';

export const SyncQueuePage = () => {
  const outboxItems = useLiveQuery(() => db.outbox.orderBy('createdAt').toArray(), [], []);

  const pending = outboxItems?.filter((item) => item.status === 'pending').length ?? 0;
  const failed = outboxItems?.filter((item) => item.status === 'failed').length ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Sync Queue</h2>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>
            Pending: {pending} · Failed: {failed} · Total: {outboxItems?.length ?? 0}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button type="button" onClick={() => runSyncOnce()}>Run Sync Now</Button>
          <Button
            type="button"
            onClick={() => clearOutbox()}
            style={{ background: '#fee2e2', color: '#b91c1c' }}
          >
            Clear All
          </Button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Entity</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Op</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Error</th>
              <th style={{ textAlign: 'right', padding: '0.75rem 1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(outboxItems ?? []).map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{item.id.slice(0, 8)}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{item.entity}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{item.op}</td>
                <td style={{ padding: '0.75rem 1rem', textTransform: 'capitalize' }}>{item.status}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#b91c1c' }}>{item.error ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  {item.status === 'failed' && (
                    <Button type="button" onClick={() => resetOutboxItem(item.id)} style={{ background: '#fef3c7', color: '#92400e' }}>
                      Retry
                    </Button>
                  )}
                  <Button type="button" onClick={() => removeOutbox(item.id)} style={{ background: '#fee2e2', color: '#b91c1c' }}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {outboxItems?.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>
                  Queue is empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SyncQueuePage;
