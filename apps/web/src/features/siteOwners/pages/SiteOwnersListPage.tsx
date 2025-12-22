import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { listSiteOwners, createSiteOwner } from '../api/siteOwnersApi';

export const SiteOwnersListPage = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');

  const { data: owners, isLoading, isError } = useQuery({
    queryKey: ['siteOwners'],
    queryFn: listSiteOwners
  });

  const createMutation = useMutation({
    mutationFn: createSiteOwner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteOwners'] });
      setName('');
      setCode('');
      setNotes('');
    }
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, code, notes: notes || undefined });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ margin: 0 }}>Site Owners</h2>

      {/* Create Form */}
      <Card>
        <h3 style={{ marginTop: 0 }}>Add New Site Owner</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., AT&T"
            required
          />
          <Input
            label="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g., ATT"
            required
          />
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem' }}>
            Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
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
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Site Owner'}
          </Button>
          {createMutation.isError && (
            <p style={{ color: '#dc2626', margin: 0, fontSize: '0.875rem' }}>
              Failed to create site owner. {createMutation.error instanceof Error ? createMutation.error.message : 'Please try again.'}
            </p>
          )}
        </form>
      </Card>

      {/* List */}
      <Card>
        <h3 style={{ marginTop: 0 }}>Existing Site Owners</h3>
        {isLoading && <p>Loading site owners...</p>}
        {isError && <p style={{ color: '#dc2626' }}>Failed to load site owners.</p>}
        {owners && owners.length === 0 && (
          <p style={{ color: '#6b7280' }}>No site owners yet. Create one above.</p>
        )}
        {owners && owners.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {owners.map((owner) => (
              <div
                key={owner.id}
                style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                      {owner.name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Code: {owner.code}
                    </div>
                    {owner.notes && (
                      <div style={{ fontSize: '0.9rem', color: '#374151', marginTop: '0.5rem' }}>
                        {owner.notes}
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/admin/site-owners/${owner.id}/fields`}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#0f766e',
                      color: 'white',
                      borderRadius: '0.5rem',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}
                  >
                    Manage Fields
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
