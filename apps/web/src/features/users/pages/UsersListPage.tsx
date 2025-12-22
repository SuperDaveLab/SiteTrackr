import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/common/Card';
import { usersApi } from '../api/usersApi';

export const UsersListPage = () => {
  const { data: users, isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.listUsers
  });

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (isError) {
    return <div>Error loading users</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Users</h2>
        <Link to="/admin/users/new">
          <button
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            + New User
          </button>
        </Link>
      </div>

      {users && users.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {users.map((user) => (
            <Card key={user.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <strong>{user.displayName}</strong>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '0.25rem',
                        backgroundColor: 
                          user.role === 'ADMIN' ? '#e0e7ff' :
                          user.role === 'DISPATCHER' ? '#dbeafe' :
                          '#e0f2fe',
                        color:
                          user.role === 'ADMIN' ? '#4338ca' :
                          user.role === 'DISPATCHER' ? '#1e40af' :
                          '#0369a1'
                      }}
                    >
                      {user.role}
                    </span>
                    {!user.isActive && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '0.25rem',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b'
                        }}
                      >
                        INACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>{user.email}</div>
                </div>
                <Link to={`/admin/users/${user.id}`}>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'white',
                      color: '#2563eb',
                      border: '1px solid #2563eb',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}
                  >
                    Manage
                  </button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p style={{ margin: 0, color: '#666' }}>No users found</p>
        </Card>
      )}
    </div>
  );
};
