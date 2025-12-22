import { FormEvent, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import {
  usersApi,
  UserRole,
  AccessLevel,
  UserSiteOwnerAccessItem,
  UserTicketTemplateAccessItem
} from '../api/usersApi';
import { listSiteOwners } from '../../siteOwners/api/siteOwnersApi';
import { fetchTemplates } from '../../templates/api/templatesApi';

export const UserDetailPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [role, setRole] = useState<UserRole>('TECH');
  const [siteOwnerAccessMap, setSiteOwnerAccessMap] = useState<Record<string, AccessLevel | 'NONE'>>({});
  const [templateAccessMap, setTemplateAccessMap] = useState<Record<string, AccessLevel | 'NONE'>>({});

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.listUsers
  });

  const { data: userAccess, isLoading: accessLoading } = useQuery({
    queryKey: ['userAccess', userId],
    queryFn: () => usersApi.getUserAccess(userId!),
    enabled: !!userId
  });

  const { data: siteOwners } = useQuery({
    queryKey: ['siteOwners'],
    queryFn: listSiteOwners
  });

  const { data: templates } = useQuery({
    queryKey: ['ticketTemplates'],
    queryFn: fetchTemplates
  });

  const updateRoleMutation = useMutation({
    mutationFn: (newRole: UserRole) => usersApi.updateUserRole(userId!, { role: newRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const updateSiteOwnerAccessMutation = useMutation({
    mutationFn: (access: UserSiteOwnerAccessItem[]) => usersApi.setUserSiteOwnerAccess(userId!, { access }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAccess', userId] });
    }
  });

  const updateTemplateAccessMutation = useMutation({
    mutationFn: (access: UserTicketTemplateAccessItem[]) => usersApi.setUserTemplateAccess(userId!, { access }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAccess', userId] });
    }
  });

  const user = users?.find(u => u.id === userId);

  // Initialize state when user and access data loads
  useEffect(() => {
    if (user) {
      setRole(user.role);
    }
  }, [user]);

  useEffect(() => {
    if (userAccess && siteOwners) {
      const map: Record<string, AccessLevel | 'NONE'> = {};
      siteOwners.forEach(owner => {
        const access = userAccess.siteOwnerAccess.find(a => a.siteOwnerId === owner.id);
        map[owner.id] = access ? access.accessLevel : 'NONE';
      });
      setSiteOwnerAccessMap(map);
    }
  }, [userAccess, siteOwners]);

  useEffect(() => {
    if (userAccess && templates) {
      const map: Record<string, AccessLevel | 'NONE'> = {};
      templates.forEach(template => {
        const access = userAccess.templateAccess.find(a => a.ticketTemplateId === template.id);
        map[template.id] = access ? access.accessLevel : 'NONE';
      });
      setTemplateAccessMap(map);
    }
  }, [userAccess, templates]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Update role if changed
    if (user && role !== user.role) {
      await updateRoleMutation.mutateAsync(role);
    }

    // Update site owner access
    const siteOwnerAccess: UserSiteOwnerAccessItem[] = Object.entries(siteOwnerAccessMap)
      .filter(([_, level]) => level !== 'NONE')
      .map(([siteOwnerId, accessLevel]) => ({
        siteOwnerId,
        accessLevel: accessLevel as AccessLevel
      }));
    await updateSiteOwnerAccessMutation.mutateAsync(siteOwnerAccess);

    // Update template access
    const templateAccess: UserTicketTemplateAccessItem[] = Object.entries(templateAccessMap)
      .filter(([_, level]) => level !== 'NONE')
      .map(([ticketTemplateId, accessLevel]) => ({
        ticketTemplateId,
        accessLevel: accessLevel as AccessLevel
      }));
    await updateTemplateAccessMutation.mutateAsync(templateAccess);

    navigate('/admin/users');
  };

  if (!user) {
    return <div>User not found</div>;
  }

  if (accessLoading) {
    return <div>Loading...</div>;
  }

  const isSaving = updateRoleMutation.isPending || updateSiteOwnerAccessMutation.isPending || updateTemplateAccessMutation.isPending;

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
        <h2 style={{ margin: 0 }}>Manage User: {user.displayName}</h2>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Role Selection */}
        <Card>
          <h3 style={{ marginTop: 0 }}>User Role</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: '#666' }}>Email</label>
            <div style={{ fontWeight: 500 }}>{user.email}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
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
              <option value="ADMIN">Admin</option>
              <option value="DISPATCHER">Dispatcher</option>
              <option value="TECH">Tech</option>
            </select>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>
              {role === 'ADMIN' && '• Full access to all features and data'}
              {role === 'DISPATCHER' && '• Can create and assign tickets'}
              {role === 'TECH' && '• Can view and update assigned tickets'}
            </div>
          </div>
        </Card>

        {/* Site Owner Access */}
        {role !== 'ADMIN' && (
          <Card>
            <h3 style={{ marginTop: 0 }}>Site Owner Access</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: 0 }}>
              Control which site owners this user can view and manage.
            </p>
            {siteOwners && siteOwners.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {siteOwners.map(owner => (
                  <div
                    key={owner.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{owner.name}</div>
                      {owner.code && <div style={{ fontSize: '0.875rem', color: '#666' }}>{owner.code}</div>}
                    </div>
                    <select
                      value={siteOwnerAccessMap[owner.id] || 'NONE'}
                      onChange={(e) =>
                        setSiteOwnerAccessMap(prev => ({
                          ...prev,
                          [owner.id]: e.target.value as AccessLevel | 'NONE'
                        }))
                      }
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="NONE">No Access</option>
                      <option value="VIEW">View</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontSize: '0.9rem' }}>No site owners available</p>
            )}
          </Card>
        )}

        {/* Template Access */}
        {role !== 'ADMIN' && (
          <Card>
            <h3 style={{ marginTop: 0 }}>Ticket Template Access</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: 0 }}>
              Control which ticket templates this user can view and manage.
            </p>
            {templates && templates.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {templates.map(template => (
                  <div
                    key={template.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem'
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{template.name}</div>
                    <select
                      value={templateAccessMap[template.id] || 'NONE'}
                      onChange={(e) =>
                        setTemplateAccessMap(prev => ({
                          ...prev,
                          [template.id]: e.target.value as AccessLevel | 'NONE'
                        }))
                      }
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="NONE">No Access</option>
                      <option value="VIEW">View</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontSize: '0.9rem' }}>No templates available</p>
            )}
          </Card>
        )}

        {role === 'ADMIN' && (
          <Card>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
              Admin users have full access to all site owners and templates. No additional access configuration needed.
            </p>
          </Card>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" onClick={() => navigate('/admin/users')} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};
