import { FormEvent, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { fetchSiteById, updateSite } from '../api/sitesApi';

export const SiteDetailPage = () => {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

  const { data: site, isLoading, isError } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => fetchSiteById(siteId!)
  });

  // Initialize custom fields when site loads
  useState(() => {
    if (site?.customFields) {
      setCustomFields(site.customFields);
    }
  });

  const updateFieldsMutation = useMutation({
    mutationFn: (fields: Record<string, unknown>) => updateSite(siteId!, { customFields: fields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
    }
  });

  const handleNewTicket = () => {
    navigate(`/tickets/new?siteId=${siteId}`);
  };

  const renderField = (
    field: { key: string; label: string; type: string; required: boolean; config?: Record<string, unknown> | null },
    value: unknown,
    onChange: (value: unknown) => void
  ) => {
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
          <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem', gridColumn: '1 / -1' }}>
            <label>{field.label}{field.required && ' *'}</label>
            <div style={{ border: '1px solid #d0d5dd', borderRadius: '0.75rem', padding: '0.75rem' }}>
              {multiOptions.map((opt, i) => (
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
              ))}
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

  if (isLoading) {
    return <div>Loading site...</div>;
  }

  if (isError || !site) {
    return (
      <Card>
        <p style={{ color: '#dc2626' }}>Failed to load site.</p>
      </Card>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    value ? (
      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.95rem' }}>
        <strong style={{ minWidth: '140px', color: '#374151' }}>{label}:</strong>
        <span style={{ color: '#6b7280' }}>{value}</span>
      </div>
    ) : null
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>{site.name}</h2>
          {site.code && <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>Site ID: {site.code}</p>}
        </div>
        <Button onClick={handleNewTicket}>New Ticket</Button>
      </div>

      <Card>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Site Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <InfoRow label="Site Name" value={site.name} />
          <InfoRow label="Site ID" value={site.code} />
          <InfoRow label="Market Name" value={site.marketName} />
          {site.owner && (
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.95rem' }}>
              <strong style={{ minWidth: '140px', color: '#374151' }}>Owner:</strong>
              <span style={{ color: '#6b7280' }}>
                {site.owner.name}
                {site.owner.code && ` (${site.owner.code})`}
              </span>
            </div>
          )}
          {!site.owner && (
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.95rem' }}>
              <strong style={{ minWidth: '140px', color: '#374151' }}>Owner:</strong>
              <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not set</span>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Location</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <InfoRow label="Street Address" value={site.addressLine1} />
          {site.addressLine2 && <InfoRow label="Address Line 2" value={site.addressLine2} />}
          <InfoRow label="City" value={site.city} />
          <InfoRow label="State" value={site.state} />
          <InfoRow label="County" value={site.county} />
          <InfoRow label="Zip Code" value={site.postalCode} />
          <InfoRow label="Latitude" value={site.latitude} />
          <InfoRow label="Longitude" value={site.longitude} />
        </div>
        {site.latitude && site.longitude && (
          <div style={{ marginTop: '1rem' }}>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${site.latitude},${site.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Get Directions
            </a>
          </div>
        )}
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Equipment & Infrastructure</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <InfoRow label="Equipment Type" value={site.equipmentType} />
          <InfoRow label="Tower Type" value={site.towerType} />
        </div>
      </Card>

      {site.notes && (
        <Card>
          <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Notes</h3>
          <p style={{ margin: 0, color: '#6b7280', whiteSpace: 'pre-wrap' }}>{site.notes}</p>
        </Card>
      )}

      {/* Custom Fields */}
      {site.owner && site.customFieldDefinitions && site.customFieldDefinitions.length > 0 && (
        <Card>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>
            Site Fields {site.owner && `(${site.owner.name})`}
          </h3>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              updateFieldsMutation.mutate(customFields);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '0.75rem'
              }}
            >
              {site.customFieldDefinitions
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((field) =>
                  renderField(
                    field,
                    customFields[field.key],
                    (value) => setCustomFields({ ...customFields, [field.key]: value })
                  )
                )}
            </div>
            <Button type="submit" disabled={updateFieldsMutation.isPending}>
              {updateFieldsMutation.isPending ? 'Saving...' : 'Save Fields'}
            </Button>
            {updateFieldsMutation.isError && (
              <p style={{ color: '#dc2626', margin: 0, fontSize: '0.875rem' }}>
                Failed to save fields. Please try again.
              </p>
            )}
          </form>
        </Card>
      )}

      {site.assets && site.assets.length > 0 && (
        <Card>
          <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Assets ({site.assets.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {site.assets.map((asset: any) => (
              <div
                key={asset.id}
                style={{
                  padding: '0.75rem',
                  background: '#f9fafb',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong>{asset.type}</strong>
                  {asset.tag && <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>({asset.tag})</span>}
                </div>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: asset.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                    color: asset.status === 'ACTIVE' ? '#065f46' : '#991b1b'
                  }}
                >
                  {asset.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {site.tickets && site.tickets.length > 0 && (
        <Card>
          <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Active Tickets ({site.tickets.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {site.tickets.map((ticket: any) => (
              <div
                key={ticket.id}
                style={{
                  padding: '0.75rem',
                  background: '#f9fafb',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{ticket.summary}</strong>
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: ticket.status === 'OPEN' ? '#dbeafe' : '#fef3c7',
                      color: ticket.status === 'OPEN' ? '#1e40af' : '#92400e'
                    }}
                  >
                    {ticket.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
