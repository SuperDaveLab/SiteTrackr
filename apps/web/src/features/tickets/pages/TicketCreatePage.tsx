import { FormEvent, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '../../../components/common/Card';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { fetchTemplateById, fetchTemplates } from '../../templates/api/templatesApi';
import { fetchSites } from '../../sites/api/sitesApi';
import { createTicket, TicketPriority } from '../api/ticketsApi';
import { groupTemplateFields } from '../utils/groupTemplateFields';

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
        <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem' }}>
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

export const TicketCreatePage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const templateIdFromUrl = params.get('templateId');
  const siteIdFromUrl = params.get('siteId');
  const assetId = params.get('assetId');

  const [selectedTemplateId, setSelectedTemplateId] = useState(templateIdFromUrl || '');
  const [selectedSiteId, setSelectedSiteId] = useState(siteIdFromUrl || '');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

  // Sync state with URL params
  useEffect(() => {
    if (templateIdFromUrl) setSelectedTemplateId(templateIdFromUrl);
    if (siteIdFromUrl) setSelectedSiteId(siteIdFromUrl);
  }, [templateIdFromUrl, siteIdFromUrl]);

  // Fetch templates list
  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates
  });

  // Fetch sites list
  const { data: sitesResponse } = useQuery({
    queryKey: ['sites', 1, 100],
    queryFn: () => fetchSites({ page: 1, pageSize: 100 })
  });

  const templates = templatesData || [];
  const sites = sitesResponse?.data || [];

  const { data: template, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['template', selectedTemplateId],
    queryFn: () => fetchTemplateById(selectedTemplateId!),
    enabled: !!selectedTemplateId
  });

  const createMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: (ticket) => {
      navigate(`/tickets/${ticket.id}`);
    }
  });

  const handleFieldChange = (key: string, value: unknown) => {
    setCustomFields({ ...customFields, [key]: value });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !selectedSiteId) return;
    
    createMutation.mutate({
      templateId: selectedTemplateId,
      siteId: selectedSiteId,
      assetId: assetId || null,
      summary,
      description: description || undefined,
      priority,
      customFields
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ margin: 0 }}>New Ticket</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>Ticket Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem' }}>
              Template *
              <select
                value={selectedTemplateId}
                onChange={(e) => {
                  setSelectedTemplateId(e.target.value);
                  setCustomFields({});
                }}
                required
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #d0d5dd',
                  fontSize: '1rem'
                }}
              >
                <option value="">-- Select Template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem' }}>
              Site *
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                required
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #d0d5dd',
                  fontSize: '1rem'
                }}
              >
                <option value="">-- Select Site --</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code && `(${s.code})`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        {selectedTemplateId && (
          <>
            {isLoadingTemplate ? (
              <Card>
                <p style={{ margin: 0 }}>Loading template...</p>
              </Card>
            ) : template ? (
              <>
                <Card>
                  <h3 style={{ marginTop: 0 }}>{template.name}</h3>
                  {template.description && (
                    <p style={{ marginTop: 0, color: '#475467' }}>{template.description}</p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <Input
                      label="Summary *"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Brief description of the work"
                      required
                    />
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem' }}>
                      Description
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Additional details (optional)"
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: '0.75rem',
                          border: '1px solid #d0d5dd',
                          fontSize: '1rem',
                          fontFamily: 'inherit',
                          minHeight: '80px'
                        }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem' }}>
                      Priority
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as TicketPriority)}
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: '0.75rem',
                          border: '1px solid #d0d5dd',
                          fontSize: '1rem'
                        }}
                      >
                        <option value="LOW">Low</option>
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </label>
                  </div>
                </Card>

                {template.fields.length > 0 && (
                  <>
                    {groupTemplateFields(template.fields).map((group) => {
                      const requiredFields = group.fields.filter((field) => field.required);
                      if (requiredFields.length === 0) {
                        return null;
                      }
                      return (
                        <Card key={group.sectionName}>
                          <h3 style={{ marginTop: 0 }}>{group.sectionName}</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {requiredFields.map((field) =>
                              renderField(
                                field,
                                customFields[field.key],
                                (value) => handleFieldChange(field.key, value)
                              )
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </>
                )}
              </>
            ) : (
              <Card>
                <p style={{ color: '#dc2626', margin: 0 }}>Failed to load template.</p>
              </Card>
            )}
          </>
        )}

        <Button type="submit" disabled={createMutation.isPending || !selectedTemplateId || !selectedSiteId}>
          {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
        </Button>
        {createMutation.isError && (
          <p style={{ color: '#dc2626', margin: 0 }}>Failed to create ticket. Please try again.</p>
        )}
      </form>
    </div>
  );
};
