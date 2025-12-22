import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Card } from '../../../components/common/Card';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setError('Enter your email and password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login({ email, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      <Card maxWidth={420}>
        <h1 style={{ marginTop: 0 }}>SiteTrackr</h1>
        <p style={{ color: '#475467', marginTop: 0 }}>Field crews, simplified.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tech@company.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />
          {error ? (
            <span style={{ color: '#d92d20', fontSize: '0.875rem' }}>{error}</span>
          ) : null}
          <Button type="submit" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      </Card>
    </div>
  );
};
