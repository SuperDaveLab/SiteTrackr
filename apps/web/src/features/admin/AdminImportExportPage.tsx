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

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      await adminImportExportApi.downloadExport(config.entityType);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
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
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{config.label}</h3>
      <p className="text-sm text-gray-600 mb-4">{config.description}</p>

      <div className="flex flex-col gap-4">
        {/* Export Section */}
        <div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : 'Export to CSV'}
          </button>
        </div>

        {/* Import Section */}
        <div className="border-t pt-4">
          <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-gray-700">
              Import from CSV
            </label>
            <input
              id={`file-${config.entityType}`}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-gray-50 focus:outline-none"
            />
            {file && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Import Results</h4>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{result.summary.totalRows}</div>
                <div className="text-xs text-gray-600">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.summary.created}</div>
                <div className="text-xs text-gray-600">Created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{result.summary.updated}</div>
                <div className="text-xs text-gray-600">Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{result.summary.rejected}</div>
                <div className="text-xs text-gray-600">Rejected</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-900 mb-2">Errors:</h5>
                <div className="max-h-60 overflow-y-auto bg-white border border-gray-200 rounded p-2">
                  {result.errors.map((err, idx) => (
                    <div key={idx} className="text-sm py-1 border-b border-gray-100 last:border-b-0">
                      <span className="font-medium text-red-600">Row {err.row}:</span>{' '}
                      <span className="text-gray-700">{err.message}</span>
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Import / Export</h1>
        <p className="text-gray-600">
          Export data to CSV for backup or editing, then import to create or update records.
        </p>
      </div>

      <div className="space-y-6">
        {ENTITIES.map((config) => (
          <EntitySection key={config.entityType} config={config} />
        ))}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>Export to get a CSV file with current data</li>
          <li>Edit the CSV in Excel or any spreadsheet editor</li>
          <li>Add new rows (leave id blank) to create new records</li>
          <li>Edit existing rows (keep id) to update records</li>
          <li>Custom fields use columns like <code className="bg-blue-100 px-1 rounded">cf:fieldKey</code></li>
          <li>Field definitions use columns like <code className="bg-blue-100 px-1 rounded">field:key:label</code></li>
          <li>Import will validate each row and report errors</li>
          <li>Invalid rows are skipped; valid rows are processed</li>
        </ul>
      </div>
    </div>
  );
}
