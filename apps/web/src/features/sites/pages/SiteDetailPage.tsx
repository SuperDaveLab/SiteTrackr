import { FormEvent, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { fetchSiteById, updateSite } from '../api/sitesApi';
import { useAuth } from '../../auth/hooks/useAuth';
import { listSiteOwners } from '../../siteOwners/api/siteOwnersApi';

type SiteFormState = {
  name: string;
  code: string;
  marketName: string;
  siteOwnerId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  county: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  equipmentType: string;
  towerType: string;
  notes: string;
};

const defaultSiteFormState: SiteFormState = {
  name: '',
  code: '',
  marketName: '',
  siteOwnerId: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  county: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  equipmentType: '',
  towerType: '',
  notes: ''
};

const normalizeNullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const normalizeMultilineNullable = (value: string): string | null => {
  return value.trim().length === 0 ? null : value;
};

const parseCoordinate = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

export const SiteDetailPage = () => {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [siteForm, setSiteForm] = useState<SiteFormState>(defaultSiteFormState);

  const { data: site, isLoading, isError } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => fetchSiteById(siteId!)
  });

  const { data: siteOwners } = useQuery({
    queryKey: ['siteOwners'],
    queryFn: listSiteOwners,
    enabled: isAdmin
  });

  useEffect(() => {
    if (!site) {
      return;
    }
    setCustomFields(site.customFields ?? {});
    setSiteForm({
      name: site.name ?? '',
      code: site.code ?? '',
      marketName: site.marketName ?? '',
      siteOwnerId: site.owner?.id ?? '',
      addressLine1: site.addressLine1 ?? '',
      addressLine2: site.addressLine2 ?? '',
      city: site.city ?? '',
      state: site.state ?? '',
      county: site.county ?? '',
      postalCode: site.postalCode ?? '',
      latitude: site.latitude !== null && site.latitude !== undefined ? String(site.latitude) : '',
      longitude: site.longitude !== null && site.longitude !== undefined ? String(site.longitude) : '',
      equipmentType: site.equipmentType ?? '',
      towerType: site.towerType ?? '',
      notes: site.notes ?? ''
    });
  }, [site]);

  const ownerOptions = siteOwners ?? [];

  const handleSiteFormChange = (field: keyof SiteFormState, value: string) => {
    setSiteForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSiteDetailsSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!siteId) {
      return;
    }

    updateSiteDetailsMutation.mutate({
      name: siteForm.name.trim(),
      code: normalizeNullable(siteForm.code),
      marketName: normalizeNullable(siteForm.marketName),
      siteOwnerId: siteForm.siteOwnerId ? siteForm.siteOwnerId : null,
      addressLine1: normalizeNullable(siteForm.addressLine1),
      addressLine2: normalizeNullable(siteForm.addressLine2),
      city: normalizeNullable(siteForm.city),
      state: normalizeNullable(siteForm.state),
      county: normalizeNullable(siteForm.county),
      postalCode: normalizeNullable(siteForm.postalCode),
      latitude: parseCoordinate(siteForm.latitude),
      longitude: parseCoordinate(siteForm.longitude),
      equipmentType: normalizeNullable(siteForm.equipmentType),
      towerType: normalizeNullable(siteForm.towerType),
      notes: normalizeMultilineNullable(siteForm.notes)
    });
  };

  const updateCustomFieldsMutation = useMutation({
    mutationFn: (fields: Record<string, unknown>) => updateSite(siteId!, { customFields: fields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
    }
  });

  const updateSiteDetailsMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateSite>[1]) => updateSite(siteId!, payload),
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

      {isAdmin && (
        <Card>
          <h3 style={{ marginTop: 0 }}>Edit Site (Admin)</h3>
          <form onSubmit={handleSiteDetailsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '0.75rem'
              }}
            >
              <Input
                label="Site Name *"
                value={siteForm.name}
                onChange={(e) => handleSiteFormChange('name', e.target.value)}
                required
              />
              <Input
                label="Site Code"
                value={siteForm.code}
                onChange={(e) => handleSiteFormChange('code', e.target.value)}
              />
              <Input
                label="Market Name"
                value={siteForm.marketName}
                onChange={(e) => handleSiteFormChange('marketName', e.target.value)}
              />
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem', color: '#1d2939' }}>
                Site Owner
                <select
                  value={siteForm.siteOwnerId}
                  onChange={(e) => handleSiteFormChange('siteOwnerId', e.target.value)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #d0d5dd',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">Unassigned</option>
                  {ownerOptions.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name} {owner.code && `(${owner.code})`}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Address Line 1"
                value={siteForm.addressLine1}
                onChange={(e) => handleSiteFormChange('addressLine1', e.target.value)}
              />
              <Input
                label="Address Line 2"
                value={siteForm.addressLine2}
                onChange={(e) => handleSiteFormChange('addressLine2', e.target.value)}
              />
              <Input
                label="City"
                value={siteForm.city}
                onChange={(e) => handleSiteFormChange('city', e.target.value)}
              />
              <Input
                label="State"
                value={siteForm.state}
                onChange={(e) => handleSiteFormChange('state', e.target.value)}
              />
              <Input
                label="County"
                value={siteForm.county}
                onChange={(e) => handleSiteFormChange('county', e.target.value)}
              />
              <Input
                label="Postal Code"
                value={siteForm.postalCode}
                onChange={(e) => handleSiteFormChange('postalCode', e.target.value)}
              />
              <Input
                label="Latitude"
                type="number"
                step="any"
                value={siteForm.latitude}
                onChange={(e) => handleSiteFormChange('latitude', e.target.value)}
              />
              <Input
                label="Longitude"
                type="number"
                step="any"
                value={siteForm.longitude}
                onChange={(e) => handleSiteFormChange('longitude', e.target.value)}
              />
              <Input
                label="Equipment Type"
                value={siteForm.equipmentType}
                onChange={(e) => handleSiteFormChange('equipmentType', e.target.value)}
              />
              <Input
                label="Tower Type"
                value={siteForm.towerType}
                onChange={(e) => handleSiteFormChange('towerType', e.target.value)}
              />
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem', color: '#1d2939' }}>
              Notes
              <textarea
                value={siteForm.notes}
                onChange={(e) => handleSiteFormChange('notes', e.target.value)}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #d0d5dd',
                  fontSize: '1rem',
                  minHeight: '80px',
                  fontFamily: 'inherit'
                }}
              />
            </label>
            <Button type="submit" disabled={updateSiteDetailsMutation.isPending}>
              {updateSiteDetailsMutation.isPending ? 'Saving...' : 'Save Site'}
            </Button>
            {updateSiteDetailsMutation.isError && (
              <p style={{ color: '#dc2626', margin: 0, fontSize: '0.875rem' }}>
                Failed to update site. Please try again.
              </p>
            )}
          </form>
        </Card>
      )}

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
              updateCustomFieldsMutation.mutate(customFields);
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
            <Button type="submit" disabled={updateCustomFieldsMutation.isPending}>
              {updateCustomFieldsMutation.isPending ? 'Saving...' : 'Save Fields'}
            </Button>
            {updateCustomFieldsMutation.isError && (
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
