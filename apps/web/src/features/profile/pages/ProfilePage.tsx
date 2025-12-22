import { Button } from '../../../components/common/Button';
import { useAuth } from '../../auth/hooks/useAuth';

export const ProfilePage = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ margin: 0 }}>Profile</h2>
      <p style={{ margin: 0 }}>Signed in as {user?.email ?? 'Unknown'}</p>
      <Button type="button" onClick={logout} fullWidth={false}>
        Sign out
      </Button>
    </div>
  );
};
