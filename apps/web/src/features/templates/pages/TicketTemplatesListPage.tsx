import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { fetchTemplates } from '../api/templatesApi';

export const TicketTemplatesListPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Ticket Templates</h2>
        <p>Loading templates...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Ticket Templates</h2>
        <p>Failed to load templates.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ margin: 0 }}>Ticket Templates</h2>
      <Button onClick={() => navigate('/admin/templates/new')}>New Template</Button>
      {data.length === 0 ? (
        <p>No templates found. Create your first template above.</p>
      ) : (
        data.map((template) => (
          <Link key={template.id} to={`/admin/templates/${template.id}`} style={{ textDecoration: 'none' }}>
            <Card>
              <strong>{template.name}</strong>
              <p style={{ margin: '0.35rem 0 0', color: '#475467' }}>
                {template.code}
                {template.description && ` • ${template.description}`}
              </p>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
};
