import { FormEvent, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { createTemplate, updateTemplate, fetchTemplateById, CreateTemplateFieldInput, TemplateFieldType } from '../api/templatesApi';

const fieldTypes: TemplateFieldType[] = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'BOOLEAN',
  'SELECT',
  'MULTI_SELECT',
  'DATE',
  'TIME',
  'DATETIME'
];

export const TicketTemplateBuilderPage = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<CreateTemplateFieldInput[]>([]);

  const isEditMode: boolean = !!(templateId && templateId !== 'new');

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => fetchTemplateById(templateId!),
    enabled: isEditMode
  });

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCode(template.code);
      setDescription(template.description || '');
      setFields(template.fields.map((f: any) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        orderIndex: f.orderIndex,
        config: f.config || undefined,
        section: f.section || undefined,
        sectionOrder: f.sectionOrder ?? 0
      })));
    }
  }, [template]);

  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      navigate('/templates');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (input: { name?: string; description?: string; fields?: CreateTemplateFieldInput[] }) => 
      updateTemplate(templateId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
      navigate('/templates');
    }
  });

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        key: '',
        label: '',
        type: 'TEXT',
        required: false,
        orderIndex: fields.length,
        sectionOrder: 0
      }
    ]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof CreateTemplateFieldInput, value: unknown) => {
    const updated = [...fields];
    (updated[index] as unknown as Record<string, unknown>)[key] = value;
    setFields(updated);
  };

  const handleAddOption = (fieldIndex: number) => {
    const updated = [...fields];
    const config = updated[fieldIndex].config || {};
    const options = (config.options as string[]) || [];
    updated[fieldIndex].config = { ...config, options: [...options, ''] };
    setFields(updated);
  };

  const handleRemoveOption = (fieldIndex: number, optionIndex: number) => {
    const updated = [...fields];
    const config = updated[fieldIndex].config || {};
    const options = ((config.options as string[]) || []).filter((_, i) => i !== optionIndex);
    updated[fieldIndex].config = { ...config, options };
    setFields(updated);
  };

  const handleOptionChange = (fieldIndex: number, optionIndex: number, value: string) => {
    const updated = [...fields];
    const config = updated[fieldIndex].config || {};
    const options = [...((config.options as string[]) || [])];
    options[optionIndex] = value;
    updated[fieldIndex].config = { ...config, options };
    setFields(updated);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || (!isEditMode && !code)) {
      alert('Name' + (!isEditMode ? ' and Code' : '') + ' are required');
      return;
    }
    
    const fieldsPayload = fields.map((f, index) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      orderIndex: f.orderIndex ?? index,
      config: f.config,
      section: f.section || undefined,
      sectionOrder: f.sectionOrder ?? 0
    }));
    
    if (isEditMode) {
      updateMutation.mutate({
        name,
        description: description || undefined,
        fields: fieldsPayload
      });
    } else {
      createMutation.mutate({
        name,
        code,
        description: description || undefined,
        fields: fieldsPayload
      });
    }
  };

  if (isEditMode && isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Template Details</h2>
        <p>Loading template...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ margin: 0 }}>{isEditMode ? 'Edit Template' : 'New Template'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>Template Info</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Generator Service"
              required
            />
            <Input
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GEN_SERVICE"
              required
              disabled={isEditMode}
            />
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem' }}>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
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
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Fields</h3>
            <Button type="button" onClick={handleAddField} fullWidth={false} style={{ padding: '0.5rem 1rem' }}>
              Add Field
            </Button>
          </div>

          {fields.length === 0 ? (
            <p style={{ color: '#475467', margin: 0 }}>No fields yet. Click "Add Field" to get started.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {fields.map((field, index) => (
                <div
                  key={index}
                  style={{
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Field {index + 1}</strong>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        padding: '0.25rem 0.5rem'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <Input
                    label="Key"
                    value={field.key}
                    onChange={(e) => handleFieldChange(index, 'key', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="wind_speed"
                    required
                  />
                  <Input
                    label="Label"
                    value={field.label}
                    onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                    placeholder="Wind Speed"
                    required
                  />
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem' }}>
                    Type
                    <select
                      value={field.type}
                      onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '0.75rem',
                        border: '1px solid #d0d5dd',
                        fontSize: '1rem'
                      }}
                    >
                      {fieldTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                    />
                    Required
                  </label>
                  <Input
                    label="Section (optional)"
                    value={field.section || ''}
                    onChange={(e) => handleFieldChange(index, 'section', e.target.value || undefined)}
                    placeholder="e.g., Generator Info, Parts, Assets"
                  />
                  <Input
                    label="Section Order"
                    type="number"
                    value={field.sectionOrder ?? 0}
                    onChange={(e) => handleFieldChange(index, 'sectionOrder', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                  {(field.type === 'SELECT' || field.type === 'MULTI_SELECT') && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.95rem', fontWeight: 500 }}>Options</label>
                        <button
                          type="button"
                          onClick={() => handleAddOption(index)}
                          style={{
                            background: '#f3f4f6',
                            border: '1px solid #d0d5dd',
                            borderRadius: '0.375rem',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.875rem',
                            cursor: 'pointer'
                          }}
                        >
                          + Add Option
                        </button>
                      </div>
                      {((field.config?.options as string[]) || []).length === 0 ? (
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>No options yet</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {((field.config?.options as string[]) || []).map((option, optIndex) => (
                            <div key={optIndex} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                                placeholder={`Option ${optIndex + 1}`}
                                style={{
                                  flex: 1,
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '0.5rem',
                                  border: '1px solid #d0d5dd',
                                  fontSize: '0.875rem'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(index, optIndex)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  padding: '0.25rem'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {isEditMode 
            ? (updateMutation.isPending ? 'Saving...' : 'Save Changes')
            : (createMutation.isPending ? 'Creating...' : 'Create Template')}
        </Button>
        {(createMutation.isError || updateMutation.isError) && (
          <p style={{ color: '#dc2626', margin: 0 }}>
            Failed to {isEditMode ? 'update' : 'create'} template. Please try again.
          </p>
        )}
      </form>
    </div>
  );
};
