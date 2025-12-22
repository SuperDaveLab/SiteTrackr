import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { listSiteOwners, listSiteFieldDefinitions, createSiteFieldDefinition } from '../api/siteOwnersApi';

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Text' },
  { value: 'TEXTAREA', label: 'Text Area' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Yes/No' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'MULTI_SELECT', label: 'Multi-Select' },
  { value: 'DATE', label: 'Date' },
  { value: 'TIME', label: 'Time' },
  { value: 'DATETIME', label: 'Date & Time' }
];

export const SiteOwnerFieldsPage = () => {
  const { siteOwnerId } = useParams();
  const queryClient = useQueryClient();
  
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('TEXT');
  const [required, setRequired] = useState(false);
  const [orderIndex, setOrderIndex] = useState(0);
  const [options, setOptions] = useState('');

  const { data: owners } = useQuery({
    queryKey: ['siteOwners'],
    queryFn: listSiteOwners
  });

  const { data: fields, isLoading, isError } = useQuery({
    queryKey: ['siteFieldDefinitions', siteOwnerId],
    queryFn: () => listSiteFieldDefinitions(siteOwnerId),
    enabled: Boolean(siteOwnerId)
  });

  const createMutation = useMutation({
    mutationFn: createSiteFieldDefinition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteFieldDefinitions', siteOwnerId] });
      setKey('');
      setLabel('');
      setType('TEXT');
      setRequired(false);
      setOrderIndex(0);
      setOptions('');
    }
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const config: Record<string, unknown> = {};
    if ((type === 'SELECT' || type === 'MULTI_SELECT') && options.trim()) {
      config.options = options.split(',').map(o => o.trim()).filter(Boolean);
    }

    createMutation.mutate({
      siteOwnerId: siteOwnerId || null,
      key,
      label,
      type,
      required,
      orderIndex,
      config: Object.keys(config).length > 0 ? config : undefined
    });
  };

  const owner = owners?.find(o => o.id === siteOwnerId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <Link to="/site-owners" style={{ color: '#0f766e', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to Site Owners
        </Link>
        <h2 style={{ margin: '0.5rem 0 0' }}>
          Custom Fields {owner && `for ${owner.name}`}
        </h2>
      </div>

      {/* Create Form */}
      <Card>
        <h3 style={{ marginTop: 0 }}>Add New Field</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem'
          }}>
            <Input
              label="Key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g., rack_height"
              required
            />
            <Input
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Rack Height"
              required
            />
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem' }}>
              Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #d0d5dd',
                  fontSize: '1rem'
                }}
              >
                {FIELD_TYPES.map(ft => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
            </label>
            <Input
              label="Order Index"
              type="number"
              value={orderIndex.toString()}
              onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
            />
          </div>

          {(type === 'SELECT' || type === 'MULTI_SELECT') && (
            <Input
              label="Options (comma-separated)"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="e.g., Option A, Option B, Option C"
            />
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
            />
            Required field
          </label>

          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Adding...' : 'Add Field'}
          </Button>
          {createMutation.isError && (
            <p style={{ color: '#dc2626', margin: 0, fontSize: '0.875rem' }}>
              Failed to create field. {createMutation.error instanceof Error ? createMutation.error.message : 'Please try again.'}
            </p>
          )}
        </form>
      </Card>

      {/* List */}
      <Card>
        <h3 style={{ marginTop: 0 }}>Existing Fields</h3>
        {isLoading && <p>Loading fields...</p>}
        {isError && <p style={{ color: '#dc2626' }}>Failed to load fields.</p>}
        {fields && fields.length === 0 && (
          <p style={{ color: '#6b7280' }}>No custom fields defined yet. Add one above.</p>
        )}
        {fields && fields.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {fields.map((field) => (
              <div
                key={field.id}
                style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '0.75rem',
                  fontSize: '0.9rem'
                }}
              >
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Key</strong>
                  <span style={{ color: '#374151' }}>{field.key}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Label</strong>
                  <span style={{ color: '#374151' }}>{field.label}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Type</strong>
                  <span style={{ color: '#374151' }}>{field.type}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Order</strong>
                  <span style={{ color: '#374151' }}>{field.orderIndex}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Required</strong>
                  <span style={{ color: '#374151' }}>{field.required ? 'Yes' : 'No'}</span>
                </div>
                {field.siteOwnerId === null && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      background: '#dbeafe', 
                      color: '#1e40af',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      GLOBAL
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
