import { useState } from 'react';
import { adminImportExportApi, type ImportResult } from '../../lib/adminImportExportApi';

type EntityType = 'site-owners' | 'sites' | 'ticket-templates' | 'tickets';

interface EntityConfig {
  label: string;
  description: string;
  entityType: EntityType;
}

const ENTITIES: EntityConfig[] = [
  {
    label: 'Site Owners',
    description: 'Export/import site owners including custom field definitions',
    entityType: 'site-owners',
  },
  {
    label: 'Sites',
    description: 'Export/import sites including custom field values',
    entityType: 'sites',
  },
  {
    label: 'Ticket Templates',
    description: 'Export/import ticket templates including field definitions',
    entityType: 'ticket-templates',
  },
  {
    label: 'Tickets',
    description: 'Export/import tickets including custom field values',
    entityType: 'tickets',
  },
];

interface EntitySectionProps {
  config: EntityConfig;
}

function EntitySection({ config }: EntitySectionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      await adminImportExportApi.downloadExport(config.entityType, exportFormat);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const processFile = (selectedFile: File) => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const isValid = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
    
    if (isValid) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    } else {
      setError('Please select a valid CSV or Excel file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleChooseFile = () => {
    const fileInput = document.getElementById(`file-${config.entityType}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const importResult = await adminImportExportApi.uploadImport(config.entityType, file);
      setResult(importResult);
      setFile(null);
      // Clear the file input
      const fileInput = document.getElementById(`file-${config.entityType}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem', background: '#fff' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: '0.5rem' }}>
        {config.label}
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: 0, marginBottom: '1rem' }}>
        {config.description}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Export Section */}
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
              Export format:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={(e) => setExportFormat(e.target.value as 'csv')}
                  style={{ cursor: 'pointer' }}
                />
                CSV
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="xlsx"
                  checked={exportFormat === 'xlsx'}
                  onChange={(e) => setExportFormat(e.target.value as 'xlsx')}
                  style={{ cursor: 'pointer' }}
                />
                Excel (.xlsx)
              </label>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              padding: '0.625rem 1.25rem',
              background: exporting ? '#9ca3af' : '#0f766e',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: exporting ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              opacity: exporting ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!exporting) e.currentTarget.style.background = '#0d9488';
            }}
            onMouseLeave={(e) => {
              if (!exporting) e.currentTarget.style.background = '#0f766e';
            }}
          >
            {exporting ? 'Exporting...' : `📥 Export to ${exportFormat.toUpperCase()}`}
          </button>
        </div>

        {/* Import Section */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
              Import from CSV or Excel
            </label>
            
            {/* Hidden file input */}
            <input
              id={`file-${config.entityType}`}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            
            {/* Custom drag/drop zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragging ? '#0f766e' : '#d1d5db'}`,
                borderRadius: '0.5rem',
                padding: '2rem',
                textAlign: 'center',
                background: isDragging ? '#f0fdfa' : '#f9fafb',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={handleChooseFile}
            >
              {file ? (
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                  <div style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>{file.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      const fileInput = document.getElementById(`file-${config.entityType}`) as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.375rem 0.75rem',
                      background: 'transparent',
                      color: '#dc2626',
                      border: '1px solid #dc2626',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📤</div>
                  <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>
                    <strong>Click to choose</strong> or drag and drop
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>CSV or Excel files (.csv, .xlsx, .xls)</div>
                </div>
              )}
            </div>
            
            {file && (
              <button
                onClick={handleImport}
                disabled={importing}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: importing ? '#9ca3af' : '#059669',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: importing ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  marginTop: '0.5rem',
                  opacity: importing ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!importing) e.currentTarget.style.background = '#047857';
                }}
                onMouseLeave={(e) => {
                  if (!importing) e.currentTarget.style.background = '#059669';
                }}
              >
                {importing ? 'Importing...' : '📤 Import'}
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', padding: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#991b1b', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '1rem' }}>
            <h4 style={{ fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: '0.5rem' }}>Import Results</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{result.summary.totalRows}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Rows</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>{result.summary.created}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Created</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f766e' }}>{result.summary.updated}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Updated</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{result.summary.rejected}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Rejected</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h5 style={{ fontWeight: 500, color: '#111827', marginTop: 0, marginBottom: '0.5rem' }}>Errors:</h5>
                <div style={{ maxHeight: '15rem', overflowY: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.25rem', padding: '0.5rem' }}>
                  {result.errors.map((err, idx) => (
                    <div key={idx} style={{ fontSize: '0.875rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', borderBottom: idx < result.errors.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <span style={{ fontWeight: 500, color: '#dc2626' }}>Row {err.row}:</span>{' '}
                      <span style={{ color: '#374151' }}>{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminImportExportPage() {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: '0.5rem' }}>
          Import / Export
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Export data to CSV or Excel for backup or editing, then import to create or update records.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {ENTITIES.map((config) => (
          <EntitySection key={config.entityType} config={config} />
        ))}
      </div>

      <div style={{ marginTop: '2rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '1rem' }}>
        <h3 style={{ fontWeight: 600, color: '#1e3a8a', marginTop: 0, marginBottom: '0.5rem' }}>How it works:</h3>
        <ul style={{ listStylePosition: 'inside', fontSize: '0.875rem', color: '#1e40af', margin: 0, paddingLeft: 0, lineHeight: '1.75' }}>
          <li>Choose your preferred export format (CSV or Excel)</li>
          <li>Export to get a file with current data</li>
          <li>Edit the file in Excel, Google Sheets, or any spreadsheet editor</li>
          <li>Add new rows (leave id blank) to create new records</li>
          <li>Edit existing rows (keep id) to update records</li>
          <li>Custom fields use columns like <code style={{ background: '#dbeafe', padding: '0.125rem 0.25rem', borderRadius: '0.25rem', fontFamily: 'monospace' }}>cf:fieldKey</code></li>
          <li>Field definitions use columns like <code style={{ background: '#dbeafe', padding: '0.125rem 0.25rem', borderRadius: '0.25rem', fontFamily: 'monospace' }}>field:key:label</code></li>
          <li>Import accepts both CSV and Excel files (.csv, .xlsx, .xls)</li>
          <li>Import will validate each row and report errors</li>
          <li>Invalid rows are skipped; valid rows are processed</li>
        </ul>
      </div>
    </div>
  );
}
