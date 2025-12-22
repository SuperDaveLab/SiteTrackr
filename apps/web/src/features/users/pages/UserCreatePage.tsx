import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { usersApi, UserRole } from '../api/usersApi';

export const UserCreatePage = () => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('TECH');
  const [password, setPassword] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: () => usersApi.createUser({ email, displayName, role, password }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate(`/admin/users/${created.id}`);
    }
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => navigate('/admin/users')}
          style={{
            padding: '0.5rem',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>Create User</h2>
      </div>

      <Card>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
          />

          <Input
            label="Display Name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="John Doe"
            required
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="role" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '1rem'
              }}
            >
              <option value="TECH">Tech</option>
              <option value="DISPATCHER">Dispatcher</option>
              <option value="ADMIN">Admin</option>
            </select>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>
              {role === 'ADMIN' && '• Full access to all features and data'}
              {role === 'DISPATCHER' && '• Can create and assign tickets'}
              {role === 'TECH' && '• Can view and update assigned tickets'}
            </div>
          </div>

          <Input
            label="Temporary Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
          />

          {createMutation.isError && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.375rem' }}>
              Failed to create user. {createMutation.error instanceof Error ? createMutation.error.message : 'Please try again.'}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create User'}
            </Button>
            <Button type="button" onClick={() => navigate('/admin/users')} disabled={createMutation.isPending}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
