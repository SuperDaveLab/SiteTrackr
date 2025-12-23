import { FormEvent, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { fetchTicketById, createVisitForTicket, updateTicket, type TicketStatus, type TicketPriority, type TicketAttachment, type VisitAttachment, type AttachmentStatus } from '../api/ticketsApi';
import { fetchTemplateById } from '../../templates/api/templatesApi';
import { groupTemplateFields } from '../utils/groupTemplateFields';
import { useAuth } from '../../auth/hooks/useAuth';
import { cacheFirstQuery } from '../../../offline/cacheFirst';
import { db } from '../../../offline/db';
import { useOnlineStatus } from '../../../offline/useOnlineStatus';
import { createVisitOffline, updateTicketOffline, addTicketAttachmentOffline, addVisitAttachmentOffline, retryAttachmentUpload } from '../../../offline/mutations';
import { runSyncOnce } from '../../../offline/syncRunner';

const renderField = (field: { key: string; label: string; type: string; required: boolean; config?: Record<string, unknown> | null }, value: unknown, onChange: (value: unknown) => void) => {
  const baseStyle = {
    padding: '0.85rem 1rem',
    borderRadius: '0.75rem',
    border: '1px solid #d0d5dd',
    fontSize: '1rem',
    width: '100%'
  };

  switch (field.type) {
    case 'TEXTAREA':
      return (
        <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem', gridColumn: '1 / -1' }}>
          {field.label}{field.required && ' *'}
          <textarea
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            style={{ ...baseStyle, minHeight: '80px', fontFamily: 'inherit' }}
          />
        </label>
      );
    case 'NUMBER':
      return (
        <Input
          key={field.key}
          label={`${field.label}${field.required ? ' *' : ''}`}
          type="number"
          value={value as string || ''}
          onChange={(e) => onChange(Number(e.target.value))}
          required={field.required}
        />
      );
    case 'BOOLEAN':
      return (
        <label key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
          <input
            type="checkbox"
            checked={value as boolean || false}
            onChange={(e) => onChange(e.target.checked)}
          />
          {field.label}
        </label>
      );
    case 'SELECT':
      const selectOptions = (field.config?.options as string[]) || [];
      return (
        <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem' }}>
          {field.label}{field.required && ' *'}
          <select
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            style={baseStyle}
          >
            <option value="">-- Select --</option>
            {selectOptions.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      );
    case 'MULTI_SELECT':
      const multiOptions = (field.config?.options as string[]) || [];
      const selectedValues = (value as string[]) || [];
      return (
        <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem' }}>
          <label>{field.label}{field.required && ' *'}</label>
          <div style={{ border: '1px solid #d0d5dd', borderRadius: '0.75rem', padding: '0.75rem' }}>
            {multiOptions.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>No options configured</p>
            ) : (
              multiOptions.map((opt, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(opt)}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...selectedValues, opt]
                        : selectedValues.filter(v => v !== opt);
                      onChange(newValues);
                    }}
                  />
                  {opt}
                </label>
              ))
            )}
          </div>
        </div>
      );
    case 'DATE':
      return (
        <Input
          key={field.key}
          label={`${field.label}${field.required ? ' *' : ''}`}
          type="date"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      );
    case 'TIME':
      return (
        <Input
          key={field.key}
          label={`${field.label}${field.required ? ' *' : ''}`}
          type="time"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      );
    case 'DATETIME':
      return (
        <Input
          key={field.key}
          label={`${field.label}${field.required ? ' *' : ''}`}
          type="datetime-local"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      );
    default:
      return (
        <Input
          key={field.key}
          label={`${field.label}${field.required ? ' *' : ''}`}
          type="text"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      );
  }
};

const statusColors: Record<string, string> = {
  OPEN: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#6b7280'
};

const priorityColors: Record<string, string> = {
  LOW: '#6b7280',
  NORMAL: '#3b82f6',
  HIGH: '#f59e0b',
  URGENT: '#dc2626'
};

const formatFieldValue = (field: { type: string; config?: Record<string, unknown> | null }, value: unknown): string => {
  if (value === null || value === undefined) return '—';
  
  switch (field.type) {
    case 'BOOLEAN':
      return value ? 'Yes' : 'No';
    case 'MULTI_SELECT':
      return Array.isArray(value) ? value.join(', ') : String(value);
    case 'DATE':
      return typeof value === 'string' ? new Date(value).toLocaleDateString() : String(value);
    case 'TIME':
      return typeof value === 'string' ? value : String(value);
    case 'DATETIME':
      return typeof value === 'string' ? new Date(value).toLocaleString() : String(value);
    default:
      return String(value);
  }
};

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes)) {
    return '—';
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const AttachmentStatusBadge = ({ status }: { status: AttachmentStatus }) => {
  const styles: Record<AttachmentStatus, { bg: string; color: string; label: string }> = {
    READY: { bg: '#d1fae5', color: '#065f46', label: 'Uploaded' },
    PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Pending upload' },
    FAILED: { bg: '#fee2e2', color: '#991b1b', label: 'Upload failed' }
  };

  const style = styles[status];
  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        borderRadius: '999px',
        padding: '0.15rem 0.5rem',
        fontSize: '0.7rem',
        fontWeight: 600,
        textTransform: 'uppercase'
      }}
    >
      {style.label}
    </span>
  );
};

const AttachmentImagePreview = ({ attachment }: { attachment: TicketAttachment | VisitAttachment }) => {
  const blobRecord = useLiveQuery(() => db.attachmentBlobs.get(attachment.id), [attachment.id]);
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (attachment.status === 'READY' || !blobRecord?.blob) {
      setLocalUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    const objectUrl = URL.createObjectURL(blobRecord.blob);
    setLocalUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return objectUrl;
    });

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blobRecord, attachment.status]);

  const src = attachment.status === 'READY' ? attachment.url : localUrl ?? undefined;

  if (!src) {
    return (
      <div
        style={{
          width: '100%',
          height: '150px',
          borderRadius: '4px',
          border: '1px dashed #d1d5db',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: '0.85rem'
        }}
      >
        Preview unavailable
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={attachment.displayName}
      style={{
        width: '100%',
        height: '150px',
        objectFit: 'cover',
        borderRadius: '4px',
        border: '1px solid #e5e7eb'
      }}
    />
  );
};

export const TicketDetailPage = () => {
  const { ticketId } = useParams();
  const { user } = useAuth();
  const { online } = useOnlineStatus();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [retryingAttachmentId, setRetryingAttachmentId] = useState<string | null>(null);

  const ticketQueryKey = ['ticket', ticketId] as const;

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ticketQueryKey,
    queryFn: () =>
      cacheFirstQuery({
        queryKey: ticketQueryKey,
        online,
        fetchRemote: () => fetchTicketById(ticketId!),
        readLocal: () => (ticketId ? db.ticketDetails.get(ticketId) : Promise.resolve(undefined)),
        writeLocal: async (detail) => {
          await db.transaction('rw', db.ticketDetails, db.tickets, db.visits, async () => {
            await db.ticketDetails.put(detail);
            await db.tickets.put({
              id: detail.id,
              summary: detail.summary,
              status: detail.status,
              priority: detail.priority,
              createdAt: detail.createdAt,
              updatedAt: detail.updatedAt,
              site: detail.site,
              asset: detail.asset ?? null,
              template: detail.template
            });
            if (detail.visits && detail.visits.length > 0) {
              await db.visits.bulkPut(
                detail.visits.map((visit) => ({
                  ...visit,
                  ticketId: detail.id
                }))
              );
            }
          });
        }
      }),
    enabled: Boolean(ticketId)
  });

  const templateId = ticket?.template.id;
  const templateQueryKey = ['template', templateId] as const;

  const { data: template } = useQuery({
    queryKey: templateQueryKey,
    queryFn: () =>
      cacheFirstQuery({
        queryKey: templateQueryKey,
        online,
        fetchRemote: () => fetchTemplateById(templateId!),
        readLocal: () => (templateId ? db.ticketTemplateDetails.get(templateId) : Promise.resolve(undefined)),
        writeLocal: async (value) => {
          await db.transaction('rw', db.ticketTemplateDetails, db.ticketTemplates, async () => {
            await db.ticketTemplateDetails.put(value);
            await db.ticketTemplates.put({
              id: value.id,
              name: value.name,
              code: value.code,
              isActive: value.isActive,
              updatedAt: value.updatedAt
            });
          });
        }
      }),
    enabled: Boolean(templateId)
  });

  useEffect(() => {
    if (ticket?.customFields) {
      setCustomFields(ticket.customFields);
    }
  }, [ticket?.customFields]);

  const createVisitMutation = useMutation({
    mutationFn: (input: { notes?: string }) => createVisitForTicket(ticketId!, input),
    onSuccess: () => {
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    }
  });

  const updateFieldsMutation = useMutation({
    mutationFn: (fields: Record<string, unknown>) => updateTicket(ticketId!, { customFields: fields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => updateTicket(ticketId!, { status: status as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    }
  });

  const updatePriorityMutation = useMutation({
    mutationFn: (priority: string) => updateTicket(ticketId!, { priority: priority as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    }
  });

  const attachmentUser = user
    ? {
        id: user.id,
        displayName: user.displayName ?? user.email ?? 'You'
      }
    : null;

  const handleTicketAttachmentChange = async (files: FileList | null) => {
    if (!ticketId || !attachmentUser || !files || files.length === 0) {
      return;
    }

    setAttachmentError(null);
    try {
      for (const file of Array.from(files)) {
        await addTicketAttachmentOffline({
          ticketId,
          file,
          user: attachmentUser
        });
      }

      if (online) {
        void runSyncOnce();
      }
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Failed to add attachment');
    }
  };

  const handleVisitAttachmentChange = async (visitId: string, files: FileList | null) => {
    if (!ticketId || !attachmentUser || !files || files.length === 0) {
      return;
    }

    setAttachmentError(null);
    try {
      for (const file of Array.from(files)) {
        await addVisitAttachmentOffline({
          ticketId,
          visitId,
          file,
          user: attachmentUser
        });
      }

      if (online) {
        void runSyncOnce();
      }
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Failed to add attachment');
    }
  };

  const handleRetryAttachment = async (attachmentId: string) => {
    setAttachmentError(null);
    setRetryingAttachmentId(attachmentId);
    try {
      await retryAttachmentUpload({ attachmentId });
      if (online) {
        void runSyncOnce();
      }
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Retry failed');
    } finally {
      setRetryingAttachmentId(null);
    }
  };

  const handleSubmitVisit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticketId) {
      return;
    }

    if (!online) {
      if (!user) {
        return;
      }
      await createVisitOffline({
        ticketId,
        visitDraft: { notes: notes || undefined },
        technician: {
          id: user.id,
          displayName: user.displayName ?? user.email ?? 'You'
        }
      });
      setNotes('');
      return;
    }

    createVisitMutation.mutate({ notes: notes || undefined });
  };

  const handleCustomFieldsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ticketId || !ticket) {
      return;
    }

    if (!online) {
      void updateTicketOffline({
        ticketId,
        patch: { customFields },
        baseUpdatedAt: ticket.updatedAt
      });
      return;
    }

    updateFieldsMutation.mutate(customFields);
  };

  const applyOfflineTicketPatch = (patch: Parameters<typeof updateTicketOffline>[0]['patch']) => {
    if (!ticketId || !ticket) {
      return;
    }
    void updateTicketOffline({
      ticketId,
      patch,
      baseUpdatedAt: ticket.updatedAt
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Ticket Details</h2>
        <p>Loading ticket...</p>
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Ticket Details</h2>
        <Card>
          <p style={{ color: '#dc2626', margin: 0 }}>Failed to load ticket.</p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ margin: 0 }}>{ticket.summary}</h2>

      {/* Job Details */}
      <Card>
        <h3 style={{ marginTop: 0 }}>Job Details</h3>
        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Template:</strong> {ticket.template.name} ({ticket.template.code})
        </div>
        {ticket.description && (
          <div style={{ marginBottom: '1rem' }}>
            <strong>Description:</strong>
            <p style={{ margin: '0.25rem 0 0', color: '#374151' }}>{ticket.description}</p>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
              Status
            </label>
            <select
              value={ticket.status}
              onChange={(e) => {
                const nextStatus = e.target.value as TicketStatus;
                if (!online) {
                  applyOfflineTicketPatch({ status: nextStatus });
                } else {
                  updateStatusMutation.mutate(nextStatus);
                }
              }}
              disabled={updateStatusMutation.isPending}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem',
                width: '100%',
                cursor: 'pointer',
                background: updateStatusMutation.isPending ? '#f3f4f6' : '#fff'
              }}
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
              Priority
            </label>
            <select
              value={ticket.priority}
              onChange={(e) => {
                const nextPriority = e.target.value as TicketPriority;
                if (!online) {
                  applyOfflineTicketPatch({ priority: nextPriority });
                } else {
                  updatePriorityMutation.mutate(nextPriority);
                }
              }}
              disabled={updatePriorityMutation.isPending}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem',
                width: '100%',
                cursor: 'pointer',
                background: updatePriorityMutation.isPending ? '#f3f4f6' : '#fff'
              }}
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Location - Enhanced */}
      <Card>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Location</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '0.75rem',
          fontSize: '0.95rem'
        }}>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Site</strong>
            <Link to={`/sites/${ticket.site.id}`} style={{ color: '#0f766e' }}>
              {ticket.site.name}
            </Link>
            {ticket.site.code && (
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}> ({ticket.site.code})</span>
            )}
          </div>
          
          {ticket.site.owner && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Owner</strong>
              <span style={{ color: '#374151' }}>
                {ticket.site.owner.name}
                {ticket.site.owner.code && (
                  <span style={{ color: '#6b7280' }}> ({ticket.site.owner.code})</span>
                )}
              </span>
            </div>
          )}

          {ticket.site.marketName && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Market</strong>
              <span style={{ color: '#374151' }}>{ticket.site.marketName}</span>
            </div>
          )}

          {ticket.site.city && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>City</strong>
              <span style={{ color: '#374151' }}>{ticket.site.city}</span>
            </div>
          )}

          {ticket.site.state && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>State</strong>
              <span style={{ color: '#374151' }}>{ticket.site.state}</span>
            </div>
          )}

          {ticket.site.county && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>County</strong>
              <span style={{ color: '#374151' }}>{ticket.site.county}</span>
            </div>
          )}

          {ticket.site.postalCode && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Postal Code</strong>
              <span style={{ color: '#374151' }}>{ticket.site.postalCode}</span>
            </div>
          )}

          {ticket.site.equipmentType && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Equipment Type</strong>
              <span style={{ color: '#374151' }}>{ticket.site.equipmentType}</span>
            </div>
          )}

          {ticket.site.towerType && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Tower Type</strong>
              <span style={{ color: '#374151' }}>{ticket.site.towerType}</span>
            </div>
          )}

          {/* Site Custom Fields (Read-Only) */}
          {ticket.site.customFieldDefinitions && 
           ticket.site.customFieldDefinitions.length > 0 && 
           ticket.site.customFields && 
           ticket.site.customFieldDefinitions
             .sort((a, b) => a.orderIndex - b.orderIndex)
             .map((field) => {
               const value = ticket.site.customFields?.[field.key];
               
               // Format the value based on field type
               const formatValue = (): React.ReactNode => {
                 if (value === null || value === undefined || value === '') {
                   return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not set</span>;
                 }

                 switch (field.type) {
                   case 'BOOLEAN':
                     return value ? 'Yes' : 'No';
                   case 'MULTI_SELECT':
                     return Array.isArray(value) ? value.join(', ') : String(value);
                   case 'DATE':
                     return new Date(value as string).toLocaleDateString();
                   case 'TIME':
                     return String(value);
                   case 'DATETIME':
                     return new Date(value as string).toLocaleString();
                   default:
                     return String(value);
                 }
               };

               return (
                 <div key={field.id}>
                   <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                     {field.label}
                   </strong>
                   <span style={{ color: '#374151' }}>{formatValue()}</span>
                 </div>
               );
             })}
        </div>

        {(ticket.site.addressLine1 || ticket.site.addressLine2) && (
          <div style={{ marginTop: '1rem', fontSize: '0.95rem' }}>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Address</strong>
            <div style={{ color: '#374151' }}>
              {ticket.site.addressLine1 && <div>{ticket.site.addressLine1}</div>}
              {ticket.site.addressLine2 && <div>{ticket.site.addressLine2}</div>}
            </div>
          </div>
        )}

        {ticket.site.latitude && ticket.site.longitude && (
          <div style={{ marginTop: '1rem', fontSize: '0.95rem' }}>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Coordinates</strong>
            <span style={{ color: '#374151' }}>
              {ticket.site.latitude.toFixed(6)}, {ticket.site.longitude.toFixed(6)}
            </span>
            <div style={{ marginTop: '0.5rem' }}>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${ticket.site.latitude},${ticket.site.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  background: '#0f766e',
                  color: 'white',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Get Directions 🗺️
              </a>
            </div>
          </div>
        )}

        {ticket.asset && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', fontSize: '0.95rem' }}>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Asset</strong>
            <div style={{ color: '#374151' }}>
              {ticket.asset.type}
              {ticket.asset.tag && ` - ${ticket.asset.tag}`}
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Status: {ticket.asset.status}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Editable Custom Fields */}
      {template && template.fields.length > 0 && (
        <form onSubmit={handleCustomFieldsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {groupTemplateFields(template.fields).map((group) => (
            <Card key={group.sectionName}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{group.sectionName}</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '0.75rem'
              }}>
                {group.fields.map((field) =>
                  renderField(
                    field,
                    customFields[field.key],
                    (value) => setCustomFields({ ...customFields, [field.key]: value })
                  )
                )}
              </div>
            </Card>
          ))}
          <Button type="submit" disabled={updateFieldsMutation.isPending}>
            {updateFieldsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          {updateFieldsMutation.isError && (
            <p style={{ color: '#dc2626', margin: '0', fontSize: '0.875rem' }}>
              Failed to save fields. Please try again.
            </p>
          )}
        </form>
      )}

      {/* Ticket Attachments */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>Ticket Attachments</h3>
          {ticket.attachments.length > 0 && (
            <a
              href={`http://localhost:3001/api/v1/tickets/${ticket.id}/attachments/download`}
              download={`ticket-${ticket.id.slice(0, 8)}-attachments.zip`}
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                borderRadius: '999px',
                border: 'none',
                background: '#0f766e',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              📦 Download All
            </a>
          )}
        </div>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          Upload timesheets, work orders, or other documents related to this ticket.
        </p>

        {/* Upload control */}
        <div style={{ marginBottom: '1rem' }}>
          <label
            style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              background: '#0f766e',
              color: '#fff',
              borderRadius: '0.5rem',
              cursor: attachmentUser ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: 500,
              opacity: attachmentUser ? 1 : 0.6
            }}
          >
            📎 Add Attachment
            <input
              type="file"
              multiple
              style={{ display: 'none' }}
              disabled={!attachmentUser}
              onChange={(e) => {
                void handleTicketAttachmentChange(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: '#6b7280' }}>
            Files sync automatically when you're back online.
          </span>
          {attachmentError && (
            <p style={{ color: '#dc2626', margin: '0.5rem 0 0', fontSize: '0.8rem' }}>{attachmentError}</p>
          )}
        </div>

        {(() => {
          const imageAttachments = ticket.attachments.filter(att => att.mimeType.startsWith('image/'));
          const otherAttachments = ticket.attachments.filter(att => !att.mimeType.startsWith('image/'));

          return (
            <>
              {/* Thumbnails for images */}
              {imageAttachments.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: otherAttachments.length > 0 ? '1rem' : 0
                  }}
                >
                  {imageAttachments.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        textAlign: 'center',
                        background: '#fff',
                        border: '1px solid #f3f4f6',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        position: 'relative'
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <AttachmentImagePreview attachment={att} />
                        <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem' }}>
                          <AttachmentStatusBadge status={att.status} />
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          marginTop: '0.25rem',
                          color: '#374151',
                          wordBreak: 'break-word'
                        }}
                      >
                        {att.displayName}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                        {formatFileSize(att.sizeBytes)} · by {att.uploadedBy.displayName}
                      </div>
                      {att.status === 'FAILED' && (
                        <button
                          type="button"
                          onClick={() => handleRetryAttachment(att.id)}
                          disabled={retryingAttachmentId === att.id}
                          style={{
                            marginTop: '0.5rem',
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.75rem',
                            borderRadius: '999px',
                            border: '1px solid #f97316',
                            background: '#fff7ed',
                            color: '#c2410c',
                            cursor: retryingAttachmentId === att.id ? 'wait' : 'pointer'
                          }}
                        >
                          {retryingAttachmentId === att.id ? 'Retrying…' : 'Retry'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Non-image attachments */}
              {otherAttachments.length > 0 && (
                <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                  {otherAttachments.map((att) => (
                    <li key={att.id} style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      {att.status === 'READY' ? (
                        <a
                          href={att.url}
                          download={att.displayName}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                        >
                          {att.displayName}
                        </a>
                      ) : (
                        <span style={{ color: '#4b5563', fontWeight: 600 }}>{att.displayName}</span>
                      )}
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>
                          {att.type.toLowerCase()}, {formatFileSize(att.sizeBytes)} · by {att.uploadedBy.displayName}
                        </span>
                        <AttachmentStatusBadge status={att.status} />
                        {att.status === 'FAILED' && (
                          <button
                            type="button"
                            onClick={() => handleRetryAttachment(att.id)}
                            disabled={retryingAttachmentId === att.id}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '0.5rem',
                              border: '1px solid #f97316',
                              background: '#fff7ed',
                              color: '#c2410c',
                              cursor: retryingAttachmentId === att.id ? 'wait' : 'pointer'
                            }}
                          >
                            {retryingAttachmentId === att.id ? 'Retrying…' : 'Retry'}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {ticket.attachments.length === 0 && (
                <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: 0 }}>
                  No ticket-level attachments yet.
                </p>
              )}
            </>
          );
        })()}
      </Card>

      {/* Visits Section */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Visits</h3>
          {ticket.visits.some(v => v.attachments && v.attachments.length > 0) && (
            <a
              href={`http://localhost:3001/api/v1/tickets/${ticket.id}/attachments/download`}
              download={`ticket-${ticket.id.slice(0, 8)}-attachments.zip`}
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                borderRadius: '999px',
                border: 'none',
                background: '#0f766e',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              📦 Download All
            </a>
          )}
        </div>
        {ticket.visits.length === 0 ? (
          <p style={{ color: '#6b7280', margin: 0 }}>No visits yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ticket.visits.map((visit) => (
              <div
                key={visit.id}
                style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                  {visit.technician.displayName}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  {new Date(visit.startedAt).toLocaleString()}
                  {visit.endedAt ? (
                    <> → {new Date(visit.endedAt).toLocaleString()}</>
                  ) : (
                    <span style={{ color: '#f59e0b', fontWeight: 500 }}> (In progress)</span>
                  )}
                </div>
                {visit.notes && (
                  <div style={{ marginTop: '0.5rem', color: '#374151' }}>{visit.notes}</div>
                )}

                {/* Attachments */}
                {visit.attachments && visit.attachments.length > 0 && (() => {
                  const imageAttachments = visit.attachments.filter(att => att.mimeType.startsWith('image/'));
                  const otherAttachments = visit.attachments.filter(att => !att.mimeType.startsWith('image/'));
                  
                  return (
                    <div style={{ marginTop: '0.75rem' }}>
                      <strong style={{ fontSize: '0.875rem' }}>Attachments:</strong>
                      
                      {/* Image thumbnails */}
                      {imageAttachments.length > 0 && (
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                          gap: '0.75rem',
                          marginTop: '0.5rem'
                        }}>
                          {imageAttachments.map((att) => (
                            <div
                              key={att.id}
                              style={{
                                textAlign: 'center',
                                background: '#fff',
                                border: '1px solid #f3f4f6',
                                borderRadius: '0.5rem',
                                padding: '0.5rem',
                                position: 'relative'
                              }}
                            >
                              <div style={{ position: 'relative' }}>
                                <AttachmentImagePreview attachment={att} />
                                <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem' }}>
                                  <AttachmentStatusBadge status={att.status} />
                                </div>
                              </div>
                              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#374151', wordBreak: 'break-word' }}>
                                {att.displayName}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                                {formatFileSize(att.sizeBytes)} · by {att.uploadedBy.displayName}
                              </div>
                              {att.status === 'FAILED' && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryAttachment(att.id)}
                                  disabled={retryingAttachmentId === att.id}
                                  style={{
                                    marginTop: '0.5rem',
                                    fontSize: '0.7rem',
                                    padding: '0.2rem 0.75rem',
                                    borderRadius: '999px',
                                    border: '1px solid #f97316',
                                    background: '#fff7ed',
                                    color: '#c2410c',
                                    cursor: retryingAttachmentId === att.id ? 'wait' : 'pointer'
                                  }}
                                >
                                  {retryingAttachmentId === att.id ? 'Retrying…' : 'Retry'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Other attachments */}
                      {otherAttachments.length > 0 && (
                        <ul style={{ 
                          paddingLeft: '1.25rem', 
                          margin: imageAttachments.length > 0 ? '0.75rem 0 0.25rem 0' : '0.25rem 0'
                        }}>
                          {otherAttachments.map((att) => (
                            <li key={att.id} style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                              {att.status === 'READY' ? (
                                <a
                                  href={att.url}
                                  download={att.displayName}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                                >
                                  {att.displayName}
                                </a>
                              ) : (
                                <span style={{ color: '#4b5563', fontWeight: 600 }}>{att.displayName}</span>
                              )}
                              <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span>
                                  {att.type.toLowerCase()}, {formatFileSize(att.sizeBytes)} · by {att.uploadedBy.displayName}
                                </span>
                                <AttachmentStatusBadge status={att.status} />
                                {att.status === 'FAILED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleRetryAttachment(att.id)}
                                    disabled={retryingAttachmentId === att.id}
                                    style={{
                                      fontSize: '0.75rem',
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '0.5rem',
                                      border: '1px solid #f97316',
                                      background: '#fff7ed',
                                      color: '#c2410c',
                                      cursor: retryingAttachmentId === att.id ? 'wait' : 'pointer'
                                    }}
                                  >
                                    {retryingAttachmentId === att.id ? 'Retrying…' : 'Retry'}
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()}

                {/* Upload attachment */}
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.875rem', cursor: 'pointer', color: '#2563eb' }}>
                    + Add attachment
                    <input
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        void handleVisitAttachmentChange(visit.id, e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    Uploads sync automatically when online.
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Visit Form */}
      <Card>
        <h3 style={{ marginTop: 0 }}>Log Visit</h3>
        <form onSubmit={handleSubmitVisit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem' }}>
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what was done..."
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid #d0d5dd',
                fontSize: '1rem',
                fontFamily: 'inherit',
                minHeight: '100px'
              }}
            />
          </label>
          <Button type="submit" disabled={createVisitMutation.isPending}>
            {createVisitMutation.isPending ? 'Logging...' : 'Log Visit'}
          </Button>
          {createVisitMutation.isError && (
            <p style={{ color: '#dc2626', margin: 0, fontSize: '0.875rem' }}>
              Failed to log visit. Please try again.
            </p>
          )}
        </form>
      </Card>

      {/* Activity Log */}
      {ticket.activities.length > 0 && (
        <Card>
          <h3 style={{ marginTop: 0 }}>Activity Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ticket.activities.map((activity) => {
              const parseValue = (val: string | null) => {
                if (!val) return <em style={{ color: '#9ca3af' }}>empty</em>;
                try {
                  const parsed = JSON.parse(val);
                  if (Array.isArray(parsed)) {
                    return parsed.join(', ');
                  }
                  if (typeof parsed === 'boolean') {
                    return parsed ? 'Yes' : 'No';
                  }
                  return String(parsed);
                } catch {
                  return val;
                }
              };

              return (
                <div
                  key={activity.id}
                  style={{
                    padding: '0.75rem',
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.9rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong style={{ color: '#374151' }}>{activity.user.displayName}</strong>
                    <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                      {new Date(activity.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {activity.action === 'field_updated' && activity.fieldLabel && (
                    <div style={{ color: '#6b7280' }}>
                      Updated <strong style={{ color: '#374151' }}>{activity.fieldLabel}</strong>
                      <div style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                        <span style={{ color: '#dc2626' }}>{parseValue(activity.oldValue || null)}</span>
                        {' → '}
                        <span style={{ color: '#10b981' }}>{parseValue(activity.newValue || null)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
